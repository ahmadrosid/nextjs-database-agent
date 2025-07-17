import { listFilesTool } from './listFiles.js';
import { readFileTool } from './readFile.js';
import { writeFileTool } from './writeFile.js';
import { bashCommandTool } from './bashCommand.js';
import { Tool, ToolCall, ToolResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTool(listFilesTool);
    this.registerTool(readFileTool);
    this.registerTool(writeFileTool);
    this.registerTool(bashCommandTool);
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);
    
    // Log tool call arguments
    logger.info('Tools', `Tool call: ${toolCall.name}`, {
      toolName: toolCall.name,
      parameters: toolCall.parameters
    });
    
    if (!tool) {
      const errorResult = {
        name: toolCall.name,
        result: '',
        error: `Tool '${toolCall.name}' not found`
      };
      
      // Log tool call result (error)
      logger.error('Tools', `Tool call failed: ${toolCall.name}`, {
        toolName: toolCall.name,
        error: errorResult.error
      });
      
      return errorResult;
    }

    try {
      const result = await tool.execute(toolCall.parameters);
      const toolResult = {
        name: toolCall.name,
        result
      };
      
      // Log tool call result (success)
      logger.info('Tools', `Tool call completed: ${toolCall.name}`, {
        toolName: toolCall.name,
        result: typeof result === 'string' ? result.slice(0, 200) + (result.length > 200 ? '...' : '') : result
      });
      
      return toolResult;
    } catch (error) {
      const errorResult = {
        name: toolCall.name,
        result: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Log tool call result (error)
      logger.error('Tools', `Tool call failed: ${toolCall.name}`, {
        toolName: toolCall.name,
        error: errorResult.error
      });
      
      return errorResult;
    }
  }

  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsForLLM(): string {
    const tools = this.getAvailableTools();
    return tools.map(tool => `
Tool: ${tool.name}
Description: ${tool.description}
Parameters: ${JSON.stringify(tool.parameters, null, 2)}
`).join('\n');
  }

  getToolsForClaudeAPI(): any[] {
    const tools = this.getAvailableTools();
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }
}

export * from '../../types/index.js';
export { listFilesTool, readFileTool, writeFileTool, bashCommandTool };