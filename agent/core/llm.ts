import Anthropic from '@anthropic-ai/sdk';
import { ToolManager } from './tools/index.js';
import { TokenUsage } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';

export class LLMService {
  private client: Anthropic;
  private systemPrompt: string;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.systemPrompt = SYSTEM_PROMPT;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  }

  async generateResponse(
    query: string, 
    onThinking?: (content: string) => void,
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void,
    onTokenUpdate?: (tokenUsage: TokenUsage) => void,
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void
  ): Promise<string> {
    try {
      // Check if query contains thinking triggers
      const needsExtendedThinking = this.shouldUseExtendedThinking(query);
      
      // Trigger thinking callback if extended thinking is needed
      if (needsExtendedThinking && onThinking) {
        onThinking('Analyzing query and planning approach...');
      }
      
      // Build messages for the conversation
      const messages: Anthropic.Messages.MessageParam[] = [
        {
          role: 'user',
          content: query
        }
      ];

      // Use native tool calling if tools are available
      const tools = toolManager ? toolManager.getToolsForClaudeAPI() : [];
      
      // Use streaming for real-time token counting
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: this.systemPrompt,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages,
        tools: tools.length > 0 ? tools.map(tool => ({
          ...tool,
          // Cache most frequently used tools: search_files, read_file, list_files
          ...(this.shouldCacheTool(tool.name) ? { cache_control: { type: "ephemeral" } } : {})
        })) : undefined,
      }, {
        headers: {
          "anthropic-beta": "prompt-caching-2024-07-31"
        }
      });

      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let toolUseContent: any[] = [];
      
      // Process the stream
      for await (const chunk of stream) {
        // Check if operation was aborted
        if (abortSignal?.aborted) {
          const abortError = new Error('Operation was cancelled');
          abortError.name = 'AbortError';
          throw abortError;
        }
        
        if (chunk.type === 'message_start') {
          // Get input tokens from message start
          inputTokens = chunk.message.usage.input_tokens;
          if (onTokenUpdate) {
            onTokenUpdate({
              inputTokens,
              outputTokens: 0,
              totalTokens: inputTokens
            });
          }
        } else if (chunk.type === 'message_delta') {
          // Update output tokens from message delta
          if (chunk.usage) {
            outputTokens = chunk.usage.output_tokens;
            if (onTokenUpdate) {
              onTokenUpdate({
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens
              });
            }
          }
        } else if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'tool_use') {
            toolUseContent.push(chunk.content_block);
          }
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            fullResponse += chunk.delta.text;
          } else if (chunk.delta.type === 'input_json_delta') {
            // Handle tool use parameter streaming
            const lastToolUse = toolUseContent[toolUseContent.length - 1];
            if (lastToolUse) {
              if (!lastToolUse.inputString) lastToolUse.inputString = '';
              lastToolUse.inputString += chunk.delta.partial_json;
            }
          }
        } else if (chunk.type === 'content_block_stop') {
          // Complete tool use input parsing
          if (toolUseContent.length > 0) {
            const lastToolUse = toolUseContent[toolUseContent.length - 1];
            if (lastToolUse && lastToolUse.inputString) {
              try {
                lastToolUse.input = JSON.parse(lastToolUse.inputString);
                delete lastToolUse.inputString; // Clean up temporary string
              } catch (e) {
                logger.error('LLMService', 'Failed to parse tool input', e);
                // Set a fallback empty object if parsing fails
                lastToolUse.input = {};
              }
            }
          }
        }
      }

      // Handle tool use response
      if (toolUseContent.length > 0) {
        return await this.handleToolUseFromStream(toolUseContent, messages, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete);
      }

      return fullResponse || 'I was unable to generate a response.';
    } catch (error) {
      // Re-throw abort errors as-is to preserve the message
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Operation was cancelled')) {
        throw error;
      }
      
      logger.error('LLMService', 'LLM API Error', error);
      throw new Error('Failed to generate response from LLM');
    }
  }

  private async handleToolUseFromStream(
    toolUseContent: any[],
    messages: Anthropic.Messages.MessageParam[],
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void,
    onTokenUpdate?: (tokenUsage: TokenUsage) => void,
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void
  ): Promise<string> {
    if (!toolManager) {
      return 'Tools are not available for this request.';
    }

    // Add the assistant's response to the conversation
    messages.push({
      role: 'assistant',
      content: toolUseContent
    });

    // Process all tool calls
    const toolResults: any[] = [];
    
    for (const contentBlock of toolUseContent) {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        const abortError = new Error('Operation was cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }

      if (contentBlock.type === 'tool_use') {
        const toolCall = {
          name: contentBlock.name,
          parameters: contentBlock.input as Record<string, any>
        };

        // Notify about tool execution with detailed info
        if (onToolExecution) {
          const paramStr = this.formatToolParameters(contentBlock.name, contentBlock.input);
          const toolCallStr = `${contentBlock.name}(${paramStr})`;
          logger.debug('LLMService', 'handleToolUseFromStream calling onToolExecution', { toolCallStr });
          onToolExecution(toolCallStr);
        }

        // Execute the tool
        const toolResult = await toolManager.executeTool(toolCall, abortSignal);
        
        // Notify about tool completion
        if (onToolComplete) {
          const isError = !!toolResult.error;
          const result = toolResult.error ? toolResult.error : toolResult.result;
          onToolComplete(contentBlock.name, result, isError);
        }
        
        toolResults.push({
          tool_use_id: contentBlock.id,
          type: 'tool_result',
          content: toolResult.error ? `Error: ${toolResult.error}` : toolResult.result
        });
      }
    }

    // Add tool results to the conversation
    messages.push({
      role: 'user',
      content: toolResults
    });

    // Check if operation was aborted before final response
    if (abortSignal?.aborted) {
      const abortError = new Error('Operation was cancelled');
      abortError.name = 'AbortError';
      throw abortError;
    }

    // Get Claude's final response
    const finalResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: this.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages,
      tools: toolManager.getToolsForClaudeAPI().map(tool => ({
        ...tool,
        // Cache most frequently used tools: search_files, read_file, list_files
        ...(this.shouldCacheTool(tool.name) ? { cache_control: { type: "ephemeral" } } : {})
      })),
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    // Handle potential additional tool calls recursively
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, messages, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete);
    }

    // Return the final text response
    const textContent = finalResponse.content.find(
      (content) => content.type === 'text'
    );

    return textContent?.text || 'I was unable to generate a final response.';
  }

  private formatToolParameters(toolName: string, parameters: any): string {
    // Format tool parameters for display
    switch (toolName) {
      case 'list_files':
        return parameters.path || '.';
      case 'read_file':
        return parameters.path || '';
      case 'write_file':
        return parameters.path || '';
      case 'bash_command':
        return parameters.command || '';
      default:
        return JSON.stringify(parameters).slice(0, 50) + '...';
    }
  }

  private async handleToolUse(
    response: Anthropic.Messages.Message,
    messages: Anthropic.Messages.MessageParam[],
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void,
    onTokenUpdate?: (tokenUsage: TokenUsage) => void,
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void
  ): Promise<string> {
    if (!toolManager) {
      return 'Tools are not available for this request.';
    }

    // Add the assistant's response to the conversation
    messages.push({
      role: 'assistant',
      content: response.content
    });

    // Process all tool calls
    const toolResults: any[] = [];
    
    for (const contentBlock of response.content) {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        const abortError = new Error('Operation was cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }

      if (contentBlock.type === 'tool_use') {
        const toolCall = {
          name: contentBlock.name,
          parameters: contentBlock.input as Record<string, any>
        };

        // Notify about tool execution with detailed info
        if (onToolExecution) {
          const paramStr = this.formatToolParameters(contentBlock.name, contentBlock.input);
          const toolCallStr = `${contentBlock.name}(${paramStr})`;
          logger.debug('LLMService', 'handleToolUse calling onToolExecution', { toolCallStr });
          onToolExecution(toolCallStr);
        }

        // Execute the tool
        const toolResult = await toolManager.executeTool(toolCall, abortSignal);
        
        // Notify about tool completion
        if (onToolComplete) {
          const isError = !!toolResult.error;
          const result = toolResult.error ? toolResult.error : toolResult.result;
          onToolComplete(contentBlock.name, result, isError);
        }
        
        toolResults.push({
          tool_use_id: contentBlock.id,
          type: 'tool_result',
          content: toolResult.error ? `Error: ${toolResult.error}` : toolResult.result
        });
      }
    }

    // Add tool results to the conversation
    messages.push({
      role: 'user',
      content: toolResults
    });

    // Check if operation was aborted before final response
    if (abortSignal?.aborted) {
      const abortError = new Error('Operation was cancelled');
      abortError.name = 'AbortError';
      throw abortError;
    }

    // Get Claude's final response
    const finalResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: this.systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages,
      tools: toolManager.getToolsForClaudeAPI().map(tool => ({
        ...tool,
        // Cache most frequently used tools: search_files, read_file, list_files
        ...(this.shouldCacheTool(tool.name) ? { cache_control: { type: "ephemeral" } } : {})
      })),
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    // Handle potential additional tool calls recursively
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, messages, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete);
    }

    // Return the final text response
    const textContent = finalResponse.content.find(
      (content) => content.type === 'text'
    );

    return textContent?.text || 'I was unable to generate a final response.';
  }

  private shouldCacheTool(toolName: string): boolean {
    // Cache the 3 most frequently used tools (max 4 cache blocks total: 1 system + 3 tools)
    // Prioritize based on database agent usage patterns
    const cachedTools = [
      'search_files',  // Most important - finding code references
      'read_file',     // Second most - reading file contents  
      'list_files'     // Third most - exploring directory structure
    ];
    
    return cachedTools.includes(toolName);
  }

  private shouldUseExtendedThinking(query: string): boolean {
    // Check for Claude 4 thinking triggers
    const thinkingTriggers = ['think', 'think hard', 'think harder', 'ultrathink'];
    const queryLower = query.toLowerCase();
    
    // Check for explicit thinking triggers
    if (thinkingTriggers.some(trigger => queryLower.includes(trigger))) {
      return true;
    }
    
    // Check for complex problem indicators
    const complexityIndicators = [
      'complex', 'analyze', 'plan', 'strategy', 'approach', 'design',
      'architecture', 'optimize', 'refactor', 'migrate', 'implement'
    ];
    
    return complexityIndicators.some(indicator => queryLower.includes(indicator));
  }
}