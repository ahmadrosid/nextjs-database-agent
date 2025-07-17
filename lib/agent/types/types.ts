export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ProgressEvent {
  type: 'thinking' | 'analyzing' | 'generating' | 'executing_tools' | 'complete' | 'error' | 'token_update' | 'thinking_complete' | 'plan';
  message: string;
  timestamp: Date;
  data?: any;
  tokenUsage?: TokenUsage;
}

export interface AgentResponse {
  id: string;
  content: string;
  timestamp: Date;
  events: ProgressEvent[];
}