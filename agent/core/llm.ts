import Anthropic from '@anthropic-ai/sdk';
import { ToolManager } from './tools/index.js';
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
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void,
    onGenerating?: () => void,
    conversationHistory?: Anthropic.Messages.MessageParam[]
  ): Promise<{ response: string; conversationHistory: Anthropic.Messages.MessageParam[] }> {
    try {
      

      // Build messages for the conversation
      const messages: Anthropic.Messages.MessageParam[] = conversationHistory ? 
        [...conversationHistory, {
          role: 'user',
          content: query
        }] : 
        [{
          role: 'user',
          content: query
        }];

      // Track the complete conversation history including tool interactions
      const completeHistory: Anthropic.Messages.MessageParam[] = [...messages];

      // Use native tool calling if tools are available
      const tools = toolManager ? toolManager.getToolsForClaudeAPI() : [];
      
      // Log the actual request being sent to Anthropic API
      const requestPayload: Anthropic.MessageStreamParams = {
        model: this.model,
        max_tokens: 8192,
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
        thinking: {
          type: "enabled",
          budget_tokens: 4096
        }
      };
      
      logger.debug('LLMService', 'Sending request to Anthropic API', {
        model: requestPayload.model,
        max_tokens: requestPayload.max_tokens,
        systemPromptLength: this.systemPrompt.length,
        messagesCount: messages.length,
        messages: messages,
        toolsCount: tools.length,
        tools: tools.map(t => t.name)
      });

      // Use streaming for real-time token counting with thinking mode
      const stream = this.client.messages.stream(requestPayload, {
        headers: {
          "anthropic-beta": "prompt-caching-2024-07-31"
        }
      });

      let fullResponse = '';
      let toolUseContent: any[] = [];
      let currentThinking = '';
      let currentSignature = '';
      
      // Process the stream
      for await (const chunk of stream) {
        // Check if operation was aborted
        if (abortSignal?.aborted) {
          const abortError = new Error('Operation was cancelled');
          abortError.name = 'AbortError';
          throw abortError;
        }
        
        if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'tool_use') {
            toolUseContent.push(chunk.content_block);
          } else if (chunk.content_block.type === 'thinking') {
            // Start of thinking block - reset thinking content and signature
            currentThinking = '';
            currentSignature = '';
          }
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            fullResponse += chunk.delta.text;
          } else if (chunk.delta.type === 'thinking_delta') {
            // Accumulate thinking content and send to callback
            currentThinking += chunk.delta.thinking;
            if (onThinking) {
              onThinking(currentThinking);
            }
          } else if (chunk.delta.type === 'signature_delta') {
            // Accumulate signature content
            currentSignature += chunk.delta.signature;
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
        const result = await this.handleToolUseFromStream(toolUseContent, messages, toolManager, onToolExecution, abortSignal, onToolComplete, onGenerating, currentThinking, currentSignature);
        
        // Build complete conversation history with tool interactions
        const finalHistory = [...completeHistory];
        
        // When thinking is enabled, we need to include thinking blocks in the conversation history
        // Build the assistant's message with thinking block first, then tool_use blocks
        const assistantContent: any[] = [];
        
        // Add thinking block if we have thinking content
        if (currentThinking) {
          const thinkingBlock: any = {
            type: 'thinking',
            thinking: currentThinking
          };
          
          // Only include signature if we have one from the API
          if (currentSignature) {
            thinkingBlock.signature = currentSignature;
          }
          
          assistantContent.push(thinkingBlock);
        }
        
        // Add tool_use blocks
        assistantContent.push(...toolUseContent);
        
        finalHistory.push({
          role: 'assistant',
          content: assistantContent
        });
        
        // Add the tool results message that was added in handleToolUseFromStream
        // The tool results are the last message added to the messages array
        const toolResultsMessage = messages[messages.length - 1];
        if (toolResultsMessage && toolResultsMessage.role === 'user') {
          finalHistory.push(toolResultsMessage);
        }
        
        // Add final assistant response
        finalHistory.push({
          role: 'assistant',
          content: result
        });
        
        return { response: result, conversationHistory: finalHistory };
      }

      // No tools used - just add the response to conversation history
      const finalHistory: Anthropic.Messages.MessageParam[] = [...completeHistory, {
        role: 'assistant' as const,
        content: fullResponse || 'I was unable to generate a response.'
      }];

      return { 
        response: fullResponse || 'I was unable to generate a response.',
        conversationHistory: finalHistory
      };
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
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void,
    onGenerating?: () => void,
    currentThinking?: string,
    currentSignature?: string
  ): Promise<string> {
    if (!toolManager) {
      return 'Tools are not available for this request.';
    }

    // When thinking is enabled, build assistant message with thinking block first
    const assistantContent: any[] = [];
    
    // Add thinking block if we have thinking content
    if (currentThinking) {
      const thinkingBlock: any = {
        type: 'thinking',
        thinking: currentThinking
      };
      
      // Only include signature if we have one from the API
      if (currentSignature) {
        thinkingBlock.signature = currentSignature;
      }
      
      assistantContent.push(thinkingBlock);
    }
    
    // Add tool_use blocks
    assistantContent.push(...toolUseContent);
    
    // Add the assistant's response to the conversation
    messages.push({
      role: 'assistant',
      content: assistantContent
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

    // Notify that we're generating the final response
    if (onGenerating) {
      onGenerating();
    }

    // Get Claude's final response
    const finalResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
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
      thinking: {
        type: "enabled",
        budget_tokens: 4096
      }
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    // Handle potential additional tool calls recursively
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, messages, toolManager, onToolExecution, abortSignal, onToolComplete, onGenerating);
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
    abortSignal?: AbortSignal,
    onToolComplete?: (toolName: string, result: string, isError?: boolean) => void,
    onGenerating?: () => void
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

    // Notify that we're generating the final response
    if (onGenerating) {
      onGenerating();
    }

    // Get Claude's final response
    const finalResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
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
      thinking: {
        type: "enabled",
        budget_tokens: 4096
      }
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    // Handle potential additional tool calls recursively
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, messages, toolManager, onToolExecution, abortSignal, onToolComplete, onGenerating);
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

}