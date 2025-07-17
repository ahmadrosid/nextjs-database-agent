import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { ToolManager } from './tools/index.js';

dotenv.config();

export class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateResponse(
    query: string, 
    onThinking?: (content: string) => void,
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void
  ): Promise<string> {
    try {
      const toolsDescription = toolManager ? toolManager.getToolsForLLM() : '';
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `<thinking>
Think step by step about how to help with this database query or operation.
Consider what the user is asking for and how to provide a helpful response.
${toolsDescription ? 'You have access to the following tools:\n' + toolsDescription : ''}
</thinking>

You are a database agent that helps with database queries and operations.

${toolsDescription ? `You have access to these tools, but only use them when necessary:
${toolsDescription}

IMPORTANT: Only use tools when you need to:
- Access file system information
- Read specific files
- Perform operations that require these tools

For general questions, database advice, or explanations, respond normally without using tools.

To use a tool when needed, format your response like this:
<tool_call>
{"name": "tool_name", "parameters": {"param1": "value1"}}
</tool_call>
` : ''}

User query: ${query}`,
          },
        ],
      });

      const textContent = response.content.find(
        (content) => content.type === 'text'
      );

      const fullResponse = textContent?.text || 'Sorry, I could not generate a response.';

      // Extract thinking content if present
      const thinkingMatch = fullResponse.match(/<thinking>(.*?)<\/thinking>/s);
      if (thinkingMatch && onThinking) {
        onThinking(thinkingMatch[1].trim());
      }

      // Check for tool calls
      const toolCallMatch = fullResponse.match(/<tool_call>(.*?)<\/tool_call>/s);
      if (toolCallMatch && toolManager) {
        try {
          const toolCall = JSON.parse(toolCallMatch[1].trim());
          
          // Notify about tool execution
          if (onToolExecution) {
            onToolExecution(toolCall.name);
          }
          
          const toolResult = await toolManager.executeTool(toolCall);
          
          if (toolResult.error) {
            // Create a follow-up message to handle the error
            const errorResponse = await this.client.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1024,
              messages: [
                {
                  role: 'user',
                  content: `You tried to use the tool "${toolCall.name}" but it failed with error: ${toolResult.error}. Please provide a helpful response to the user about this error.`
                }
              ]
            });
            
            const errorTextContent = errorResponse.content.find(
              (content) => content.type === 'text'
            );
            
            return errorTextContent?.text || `Tool execution failed: ${toolResult.error}`;
          }
          
          // Feed the tool result back to the LLM for processing
          const followUpResponse = await this.client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `You used the tool "${toolCall.name}" and got this result:

${toolResult.result}

Please provide a helpful response to the user based on this information. You can format the output nicely, add explanations, or provide additional context as needed.`
              }
            ]
          });
          
          const followUpTextContent = followUpResponse.content.find(
            (content) => content.type === 'text'
          );
          
          return followUpTextContent?.text || toolResult.result;
        } catch (error) {
          return `Error parsing tool call: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      // Return response without thinking and tool call tags
      const cleanResponse = fullResponse
        .replace(/<thinking>.*?<\/thinking>/s, '')
        .replace(/<tool_call>.*?<\/tool_call>/s, '')
        .trim();
      
      return cleanResponse || 'I processed your query but generated no response.';
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }
}