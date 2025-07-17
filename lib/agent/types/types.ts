export interface ProgressEvent {
  type: 'thinking' | 'analyzing' | 'generating' | 'executing_tools' | 'complete' | 'error';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface AgentResponse {
  id: string;
  content: string;
  timestamp: Date;
  events: ProgressEvent[];
}