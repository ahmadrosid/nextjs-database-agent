import { CoreAgent } from '../../lib/agent/core/CoreAgent';
import { LLMService } from '../../lib/agent/core/llm';
import { ProgressEvent } from '../../lib/agent/types/index';
import { ToolManager } from '../../lib/agent/core/tools/index';

// Mock the LLMService and ToolManager
jest.mock('../../lib/agent/core/llm');
jest.mock('../../lib/agent/core/tools/index');

// Mock globby to avoid ES module issues
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

describe('CoreAgent', () => {
  let coreAgent: CoreAgent;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockToolManager: jest.Mocked<ToolManager>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new CoreAgent instance
    coreAgent = new CoreAgent();
    
    // Get the mocked instances
    mockLLMService = jest.mocked(LLMService.prototype);
    mockToolManager = jest.mocked(ToolManager.prototype);
  });

  afterEach(() => {
    // Clean up event listeners
    coreAgent.removeAllListeners();
  });

  describe('Event Emission Order', () => {
    it('should emit progress events in correct order during successful processing without tools', async () => {
      const mockResponse = 'Test response from LLM';
      mockLLMService.generateResponse.mockResolvedValue(mockResponse);

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      const result = await coreAgent.processQuery('test query');

      expect(result).toBe(mockResponse);
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('thinking');
      expect(events[1].type).toBe('analyzing');
      expect(events[2].type).toBe('generating');
      expect(events[3].type).toBe('complete');
    });

    it('should emit progress events in correct order when tools are executed', async () => {
      const mockResponse = 'Test response from LLM';
      
      // Mock LLM to call tool execution callback
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking, toolManager, onToolExecution) => {
        // Simulate thinking callback
        if (onThinking) {
          onThinking('Thinking about the query');
        }
        
        // Simulate tool execution callback
        if (onToolExecution) {
          onToolExecution('list_files');
        }
        
        return mockResponse;
      });

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      const result = await coreAgent.processQuery('list files');

      expect(result).toBe(mockResponse);
      expect(events).toHaveLength(6);
      expect(events[0].type).toBe('thinking');
      expect(events[1].type).toBe('analyzing');
      expect(events[2].type).toBe('thinking'); // From onThinking callback
      expect(events[3].type).toBe('executing_tools');
      expect(events[4].type).toBe('generating');
      expect(events[5].type).toBe('complete');
    });
  });

  describe('Concurrent Query Prevention', () => {
    it('should reject concurrent queries', async () => {
      mockLLMService.generateResponse.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('response'), 100))
      );

      const firstQuery = coreAgent.processQuery('first query');
      
      await expect(coreAgent.processQuery('second query')).rejects.toThrow(
        'Agent is already processing a query'
      );

      await firstQuery;
    });

    it('should allow new queries after previous one completes', async () => {
      mockLLMService.generateResponse.mockResolvedValue('response');

      await coreAgent.processQuery('first query');
      
      await expect(coreAgent.processQuery('second query')).resolves.toBe('response');
    });
  });

  describe('Error Handling', () => {
    it('should emit error event when LLM fails', async () => {
      const errorMessage = 'LLM API failed';
      mockLLMService.generateResponse.mockRejectedValue(new Error(errorMessage));

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      await expect(coreAgent.processQuery('test query')).rejects.toThrow(errorMessage);

      const errorEvent = events.find(event => event.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.message).toBe(errorMessage);
    });

    it('should allow new queries after error', async () => {
      mockLLMService.generateResponse
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce('Success response');

      await expect(coreAgent.processQuery('failing query')).rejects.toThrow();
      await expect(coreAgent.processQuery('success query')).resolves.toBe('Success response');
    });
  });

  describe('Success Flow', () => {
    it('should return response and emit complete event with data', async () => {
      const mockResponse = 'Successful response';
      mockLLMService.generateResponse.mockResolvedValue(mockResponse);

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      const result = await coreAgent.processQuery('test query');

      expect(result).toBe(mockResponse);
      
      const completeEvent = events.find(event => event.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent?.data?.response).toBe(mockResponse);
    });

    it('should indicate processing status correctly', async () => {
      mockLLMService.generateResponse.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('response'), 50))
      );

      expect(coreAgent.isCurrentlyProcessing()).toBe(false);
      
      const queryPromise = coreAgent.processQuery('test query');
      expect(coreAgent.isCurrentlyProcessing()).toBe(true);
      
      await queryPromise;
      expect(coreAgent.isCurrentlyProcessing()).toBe(false);
    });
  });

  describe('Tool Integration', () => {
    it('should pass toolManager to LLM service', async () => {
      const mockResponse = 'Test response';
      mockLLMService.generateResponse.mockResolvedValue(mockResponse);

      await coreAgent.processQuery('test query');

      expect(mockLLMService.generateResponse).toHaveBeenCalledWith(
        'test query',
        expect.any(Function), // onThinking callback
        expect.any(Object),   // toolManager
        expect.any(Function)  // onToolExecution callback
      );
    });

    it('should emit executing_tools event when onToolExecution callback is called', async () => {
      const mockResponse = 'Test response';
      
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking, toolManager, onToolExecution) => {
        if (onToolExecution) {
          onToolExecution('read_file');
        }
        return mockResponse;
      });

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      await coreAgent.processQuery('read package.json');

      const toolEvent = events.find(e => e.type === 'executing_tools');
      expect(toolEvent).toBeDefined();
      expect(toolEvent?.message).toBe('Executing read_file...');
    });

    it('should emit thinking events when onThinking callback is called', async () => {
      const mockResponse = 'Test response';
      const thinkingContent = 'I need to analyze this request';
      
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking) => {
        if (onThinking) {
          onThinking(thinkingContent);
        }
        return mockResponse;
      });

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      await coreAgent.processQuery('test query');

      const thinkingEvents = events.filter(e => e.type === 'thinking');
      expect(thinkingEvents.length).toBeGreaterThan(1); // Initial + callback
      expect(thinkingEvents.some(e => e.message === thinkingContent)).toBe(true);
    });
  });

  describe('Error Handling with Tools', () => {
    it('should handle LLM errors during tool processing', async () => {
      const errorMessage = 'LLM failed during tool processing';
      mockLLMService.generateResponse.mockRejectedValue(new Error(errorMessage));

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      await expect(coreAgent.processQuery('test query')).rejects.toThrow(errorMessage);

      const errorEvent = events.find(event => event.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.message).toBe(errorMessage);
    });

    it('should still allow new queries after tool-related errors', async () => {
      mockLLMService.generateResponse
        .mockRejectedValueOnce(new Error('Tool processing failed'))
        .mockResolvedValueOnce('Success after error');

      await expect(coreAgent.processQuery('failing query')).rejects.toThrow();
      await expect(coreAgent.processQuery('success query')).resolves.toBe('Success after error');
    });
  });
});