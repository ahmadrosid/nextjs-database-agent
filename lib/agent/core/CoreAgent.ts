import { EventEmitter } from 'eventemitter3';
import { LLMService } from './llm.js';
import { ProgressEvent, TokenUsage } from '../types/index.js';
import { ToolManager } from './tools/index.js';
import { logger } from '../utils/logger.js';

export class CoreAgent extends EventEmitter {
  private llmService: LLMService;
  private toolManager: ToolManager;
  private isProcessing = false;
  private thinkingOutput: string = '';

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
    this.thinkingOutput = ''; // Reset thinking output

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
        (content: string) => {
          // Capture thinking output
          this.thinkingOutput = content;
          this.emitProgress({
            type: 'thinking',
            message: content,
            timestamp: new Date(),
          });
        },
        this.toolManager,
        (toolName) => {
          logger.debug('CoreAgent', 'onToolExecution callback received', { toolName });
          
          // Emit thinking output as message before tool execution
          if (this.thinkingOutput.trim()) {
            this.emitProgress({
              type: 'thinking_complete',
              message: this.thinkingOutput,
              timestamp: new Date(),
            });
            this.thinkingOutput = ''; // Clear after emitting
          }
          
          this.emitProgress({
            type: 'executing_tools',
            message: `Executing ${toolName}`,
            timestamp: new Date(),
          });
        },
        (tokenUsage: TokenUsage) => {
          this.emitProgress({
            type: 'token_update',
            message: `Tokens: ${tokenUsage.inputTokens}→${tokenUsage.outputTokens} (${tokenUsage.totalTokens})`,
            timestamp: new Date(),
            tokenUsage,
          });
        }
      );

      // Emit thinking output as message if it wasn't emitted before
      if (this.thinkingOutput.trim()) {
        this.emitProgress({
          type: 'thinking_complete',
          message: this.thinkingOutput,
          timestamp: new Date(),
        });
      }

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