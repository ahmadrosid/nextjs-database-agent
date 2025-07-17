import { listFilesTool } from './listFiles.js';
import { readFileTool } from './readFile.js';
import { Tool, ToolCall, ToolResult } from '../../types/index.js';

export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTool(listFilesTool);
    this.registerTool(readFileTool);
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.name);
    
    if (!tool) {
      return {
        name: toolCall.name,
        result: '',
        error: `Tool '${toolCall.name}' not found`
      };
    }

    try {
      const result = await tool.execute(toolCall.parameters);
      return {
        name: toolCall.name,
        result
      };
    } catch (error) {
      return {
        name: toolCall.name,
        result: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
}

export * from '../../types/index.js';
export { listFilesTool, readFileTool };