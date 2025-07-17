import { EventEmitter } from 'eventemitter3';
import { LLMService } from './llm.js';
import { ProgressEvent } from '../types/index.js';
import { ToolManager } from './tools/index.js';

export class CoreAgent extends EventEmitter {
  private llmService: LLMService;
  private toolManager: ToolManager;
  private isProcessing = false;

  constructor() {
    super();
    this.llmService = new LLMService();
    this.toolManager = new ToolManager();
  }

  async processQuery(query: string): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Agent is already processing a query');
    }

    this.isProcessing = true;

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

      // Generate response using LLM with tools
      const response = await this.llmService.generateResponse(
        query, 
        this.toolManager,
        (toolName) => {
          this.emitProgress({
            type: 'executing_tools',
            message: `Executing ${toolName}...`,
            timestamp: new Date(),
          });
        }
      );

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