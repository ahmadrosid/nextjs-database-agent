export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>, abortSignal?: AbortSignal) => Promise<string>;
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: string;
  error?: string;
}