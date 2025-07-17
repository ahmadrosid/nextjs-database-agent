import { EventEmitter } from 'eventemitter3';
import { LLMService } from './llm.js';
import { ProgressEvent, AgentResponse } from './types.js';

export class CoreAgent extends EventEmitter {
  private llmService: LLMService;
  private isProcessing = false;

  constructor() {
    super();
    this.llmService = new LLMService();
  }

  async processQuery(query: string): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Agent is already processing a query');
    }

    this.isProcessing = true;
    const jobId = Date.now().toString();

    try {
      // Emit thinking event
      this.emitProgress({
        type: 'thinking',
        message: 'Thinking about your query...',
        timestamp: new Date(),
      });

      // Emit analyzing event
      this.emitProgress({
        type: 'analyzing',
        message: 'Analyzing database requirements...',
        timestamp: new Date(),
      });

      // Generate response using LLM with thinking callback
      const response = await this.llmService.generateResponse(query, (thinkingContent) => {
        this.emitProgress({
          type: 'thinking',
          message: thinkingContent,
          timestamp: new Date(),
        });
      });

      // Emit generating event
      this.emitProgress({
        type: 'generating',
        message: 'Finalizing response...',
        timestamp: new Date(),
      });

      // Emit complete event
      this.emitProgress({
        type: 'complete',
        message: 'Query processed successfully',
        timestamp: new Date(),
        data: { response },
      });

      return response;
    } catch (error) {
      // Emit error event
      this.emitProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date(),
        data: { error },
      });

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}