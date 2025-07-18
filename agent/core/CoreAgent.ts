import { EventEmitter } from 'eventemitter3';
import { LLMService } from './llm.js';
import { ProgressEvent } from '../types/index.js';
import { ToolManager } from './tools/index.js';
import { logger } from '../utils/logger.js';
import Anthropic from '@anthropic-ai/sdk';

export class CoreAgent extends EventEmitter {
  private llmService: LLMService;
  private toolManager: ToolManager;
  private isProcessing = false;
  private thinkingOutput: string = '';
  private currentAbortController: AbortController | null = null;
  private conversationHistory: Anthropic.Messages.MessageParam[] = [];

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
    this.currentAbortController = new AbortController();

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

      // Generate response using LLM with tools and conversation history (before current query)
      const result = await this.llmService.generateResponse(
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
        this.currentAbortController.signal,
        (toolName: string, result: string, isError?: boolean) => {
          // Handle tool completion
          const safeResult = result || '';
          this.emitProgress({
            type: isError ? 'tool_execution_error' : 'tool_execution_complete',
            message: isError ? `Error in ${toolName}: ${safeResult.slice(0, 200)}${safeResult.length > 200 ? '...' : ''}` : `${toolName} completed: ${safeResult.slice(0, 200)}${safeResult.length > 200 ? '...' : ''}`,
            timestamp: new Date(),
            data: { toolName, result, isError }
          });
        },
        () => {
          // onGenerating callback - emit 'generating' progress event
          this.emitProgress({
            type: 'generating',
            message: 'Finalizing response...',
            timestamp: new Date(),
          });
        },
        [...this.conversationHistory] // Pass a copy of current history (before this query)
      );

      const response = result.response;

      // Emit thinking output as message if it wasn't emitted before
      if (this.thinkingOutput.trim()) {
        this.emitProgress({
          type: 'thinking_complete',
          message: this.thinkingOutput,
          timestamp: new Date(),
        });
      }

      // Update conversation history with the complete history from LLMService (includes tool interactions)
      this.conversationHistory = result.conversationHistory;

      // Keep conversation history manageable (limit to last 10 exchanges = 20 messages)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      this.emitProgress({
        type: 'complete',
        message: 'Query processed successfully',
        timestamp: new Date(),
        data: { response },
      });

      return response;
    } catch (error) {
      // Handle abort signal
      if (error instanceof Error && error.name === 'AbortError') {
        this.emitProgress({
          type: 'aborted',
          message: 'Operation was cancelled',
          timestamp: new Date(),
          data: { error },
        });
        // Re-throw the original error to preserve the message
        throw error;
      }

      this.emitProgress({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date(),
        data: { error },
      });

      throw error;
    } finally {
      this.isProcessing = false;
      this.currentAbortController = null;
    }
  }

  private emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  abort(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
  }
}