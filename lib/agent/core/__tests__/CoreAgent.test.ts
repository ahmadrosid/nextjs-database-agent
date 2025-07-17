import { CoreAgent } from '../CoreAgent';
import { LLMService } from '../llm';
import { ProgressEvent } from '../types';

// Mock the LLMService
jest.mock('../llm');

describe('CoreAgent', () => {
  let coreAgent: CoreAgent;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new CoreAgent instance
    coreAgent = new CoreAgent();
    
    // Get the mocked LLMService instance
    mockLLMService = jest.mocked(LLMService.prototype);
  });

  afterEach(() => {
    // Clean up event listeners
    coreAgent.removeAllListeners();
  });

  describe('Event Emission Order', () => {
    it('should emit progress events in correct order during successful processing', async () => {
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
});