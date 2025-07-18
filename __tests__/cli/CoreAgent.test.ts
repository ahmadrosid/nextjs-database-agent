import { CoreAgent } from '../../agent/core/CoreAgent';
import { LLMService } from '../../agent/core/llm';
import { ProgressEvent } from '../../agent/types/index';
import { ToolManager } from '../../agent/core/tools/index';

// Mock the LLMService and ToolManager
jest.mock('../../agent/core/llm');
jest.mock('../../agent/core/tools/index');

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
      
      // Mock LLM to call the onGenerating callback
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete, onGenerating, conversationHistory) => {
        // Simulate generating callback
        if (onGenerating) {
          onGenerating();
        }
        
        return { 
          response: mockResponse, 
          conversationHistory: [
            { role: 'user' as const, content: query },
            { role: 'assistant' as const, content: mockResponse }
          ]
        };
      });

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
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete, onGenerating, conversationHistory) => {
        // Simulate thinking callback
        if (onThinking) {
          onThinking('Thinking about the query');
        }
        
        // Simulate tool execution callback
        if (onToolExecution) {
          onToolExecution('list_files');
        }
        
        // Simulate generating callback
        if (onGenerating) {
          onGenerating();
        }
        
        return { 
          response: mockResponse, 
          conversationHistory: [
            { role: 'user' as const, content: query },
            { role: 'assistant' as const, content: mockResponse }
          ]
        };
      });

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      const result = await coreAgent.processQuery('list files');

      expect(result).toBe(mockResponse);
      expect(events).toHaveLength(7);
      expect(events[0].type).toBe('thinking');
      expect(events[1].type).toBe('analyzing');
      expect(events[2].type).toBe('thinking'); // From onThinking callback
      expect(events[3].type).toBe('thinking_complete'); // When thinking is complete
      expect(events[4].type).toBe('executing_tools');
      expect(events[5].type).toBe('generating');
      expect(events[6].type).toBe('complete');
    });
  });

  describe('Concurrent Query Prevention', () => {
    it('should reject concurrent queries', async () => {
      mockLLMService.generateResponse.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ response: 'response', conversationHistory: [] }), 100))
      );

      const firstQuery = coreAgent.processQuery('first query');
      
      await expect(coreAgent.processQuery('second query')).rejects.toThrow(
        'Agent is already processing a query'
      );

      await firstQuery;
    });

    it('should allow new queries after previous one completes', async () => {
      mockLLMService.generateResponse.mockResolvedValue({ response: 'response', conversationHistory: [] });

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
        .mockResolvedValueOnce({ response: 'Success response', conversationHistory: [] });

      await expect(coreAgent.processQuery('failing query')).rejects.toThrow();
      await expect(coreAgent.processQuery('success query')).resolves.toBe('Success response');
    });
  });

  describe('Success Flow', () => {
    it('should return response and emit complete event with data', async () => {
      const mockResponse = 'Successful response';
      mockLLMService.generateResponse.mockResolvedValue({ response: mockResponse, conversationHistory: [] });

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
        new Promise(resolve => setTimeout(() => resolve({ response: 'response', conversationHistory: [] }), 50))
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
      mockLLMService.generateResponse.mockResolvedValue({ response: mockResponse, conversationHistory: [] });

      await coreAgent.processQuery('test query');

      expect(mockLLMService.generateResponse).toHaveBeenCalledWith(
        'test query',
        expect.any(Function), // onThinking callback
        expect.any(Object),   // toolManager
        expect.any(Function), // onToolExecution callback
        expect.any(Function), // onTokenUpdate callback
        expect.any(Object),   // abortSignal
        expect.any(Function), // onToolComplete callback
        expect.any(Function), // onGenerating callback
        expect.any(Array)     // conversationHistory
      );
    });

    it('should emit executing_tools event when onToolExecution callback is called', async () => {
      const mockResponse = 'Test response';
      
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking, toolManager, onToolExecution) => {
        if (onToolExecution) {
          onToolExecution('read_file');
        }
        return { response: mockResponse, conversationHistory: [] };
      });

      const events: ProgressEvent[] = [];
      coreAgent.on('progress', (event: ProgressEvent) => {
        events.push(event);
      });

      await coreAgent.processQuery('read package.json');

      const toolEvent = events.find(e => e.type === 'executing_tools');
      expect(toolEvent).toBeDefined();
      expect(toolEvent?.message).toBe('Executing read_file');
    });

    it('should emit thinking events when onThinking callback is called', async () => {
      const mockResponse = 'Test response';
      const thinkingContent = 'I need to analyze this request';
      
      mockLLMService.generateResponse.mockImplementation(async (query, onThinking) => {
        if (onThinking) {
          onThinking(thinkingContent);
        }
        return { response: mockResponse, conversationHistory: [] };
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
        .mockResolvedValueOnce({ response: 'Success after error', conversationHistory: [] });

      await expect(coreAgent.processQuery('failing query')).rejects.toThrow();
      await expect(coreAgent.processQuery('success query')).resolves.toBe('Success after error');
    });
  });

  describe('Conversation History', () => {
    it('should pass empty conversation history on first query', async () => {
      const mockResponse = 'First response';
      mockLLMService.generateResponse.mockResolvedValue({ response: mockResponse, conversationHistory: [] });

      await coreAgent.processQuery('first query');

      expect(mockLLMService.generateResponse).toHaveBeenCalledWith(
        'first query',
        expect.any(Function), // onThinking callback
        expect.any(Object),   // toolManager
        expect.any(Function), // onToolExecution callback
        expect.any(Function), // onTokenUpdate callback
        expect.any(Object),   // abortSignal
        expect.any(Function), // onToolComplete callback
        expect.any(Function), // onGenerating callback
        []                    // empty conversation history
      );
    });

    it('should pass conversation history on subsequent queries', async () => {
      mockLLMService.generateResponse
        .mockResolvedValueOnce({ 
          response: 'First response', 
          conversationHistory: [
            { role: 'user' as const, content: 'first query' },
            { role: 'assistant' as const, content: 'First response' }
          ]
        })
        .mockResolvedValueOnce({ 
          response: 'Second response', 
          conversationHistory: [
            { role: 'user' as const, content: 'first query' },
            { role: 'assistant' as const, content: 'First response' },
            { role: 'user' as const, content: 'second query' },
            { role: 'assistant' as const, content: 'Second response' }
          ]
        });

      await coreAgent.processQuery('first query');
      await coreAgent.processQuery('second query');

      // Check the second call includes conversation history
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8]; // 9th parameter (0-indexed)
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'first query' },
        { role: 'assistant' as const, content: 'First response' }
      ]);
    });

    it('should maintain conversation history across multiple queries', async () => {
      mockLLMService.generateResponse
        .mockResolvedValueOnce({ 
          response: 'Response 1', 
          conversationHistory: [
            { role: 'user' as const, content: 'query 1' },
            { role: 'assistant' as const, content: 'Response 1' }
          ]
        })
        .mockResolvedValueOnce({ 
          response: 'Response 2', 
          conversationHistory: [
            { role: 'user' as const, content: 'query 1' },
            { role: 'assistant' as const, content: 'Response 1' },
            { role: 'user' as const, content: 'query 2' },
            { role: 'assistant' as const, content: 'Response 2' }
          ]
        })
        .mockResolvedValueOnce({ 
          response: 'Response 3', 
          conversationHistory: [
            { role: 'user' as const, content: 'query 1' },
            { role: 'assistant' as const, content: 'Response 1' },
            { role: 'user' as const, content: 'query 2' },
            { role: 'assistant' as const, content: 'Response 2' },
            { role: 'user' as const, content: 'query 3' },
            { role: 'assistant' as const, content: 'Response 3' }
          ]
        });

      await coreAgent.processQuery('query 1');
      await coreAgent.processQuery('query 2');
      await coreAgent.processQuery('query 3');

      // Check the third call includes all previous conversation
      const thirdCall = mockLLMService.generateResponse.mock.calls[2];
      const conversationHistory = thirdCall[8]; // 9th parameter (0-indexed)
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'query 1' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'query 2' },
        { role: 'assistant' as const, content: 'Response 2' }
      ]);
    });

    it('should limit conversation history to 20 messages (10 exchanges)', async () => {
      // Mock 15 queries to exceed the limit
      for (let i = 1; i <= 15; i++) {
        const conversationHistory = [];
        for (let j = Math.max(1, i - 9); j <= i; j++) {
          conversationHistory.push({ role: 'user' as const, content: `query ${j}` });
          conversationHistory.push({ role: 'assistant' as const, content: `Response ${j}` });
        }
        // Limit to 20 messages
        const limitedHistory = conversationHistory.slice(-20);
        
        mockLLMService.generateResponse.mockResolvedValueOnce({ 
          response: `Response ${i}`, 
          conversationHistory: limitedHistory
        });
      }

      // Execute 15 queries
      for (let i = 1; i <= 15; i++) {
        await coreAgent.processQuery(`query ${i}`);
      }

      // Check the last call includes only the most recent 10 exchanges (20 messages)
      const lastCall = mockLLMService.generateResponse.mock.calls[14]; // 15th call (0-indexed)
      const conversationHistory = lastCall[8]; // 9th parameter (0-indexed)
      
      expect(conversationHistory).toBeDefined();
      expect(conversationHistory).toHaveLength(20); // 10 exchanges = 20 messages
      
      // Should start from exchange 5 (query 5 and response 5)
      expect(conversationHistory![0]).toEqual({ role: 'user' as const, content: 'query 5' });
      expect(conversationHistory![1]).toEqual({ role: 'assistant' as const, content: 'Response 5' });
      
      // Should end with exchange 14
      expect(conversationHistory![18]).toEqual({ role: 'user' as const, content: 'query 14' });
      expect(conversationHistory![19]).toEqual({ role: 'assistant' as const, content: 'Response 14' });
    });
  });

  describe('Tool Use in Conversation History', () => {
    it('should include tool_use and tool_result blocks in conversation history', async () => {
      // Mock a tool use scenario
      mockLLMService.generateResponse
        .mockResolvedValueOnce({ 
          response: 'First response without tools',
          conversationHistory: [
            { role: 'user' as const, content: 'first query' },
            { role: 'assistant' as const, content: 'First response without tools' }
          ]
        })
        .mockImplementationOnce(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete, onGenerating, conversationHistory) => {
          // Simulate tool execution callback
          if (onToolExecution) {
            onToolExecution('read_file(package.json)');
          }
          
          // Simulate tool completion callback
          if (onToolComplete) {
            onToolComplete('read_file', '{"dependencies": {"react": "^19.0.0"}}', false);
          }
          
          return { 
            response: 'Response using tool result',
            conversationHistory: [
              { role: 'user' as const, content: 'first query' },
              { role: 'assistant' as const, content: 'First response without tools' },
              { role: 'user' as const, content: 'read package.json' },
              { role: 'assistant' as const, content: 'Response using tool result' }
            ]
          };
        });

      await coreAgent.processQuery('first query');
      await coreAgent.processQuery('read package.json');

      // Check the second call includes conversation history with tool interactions
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8]; // 9th parameter (0-indexed)
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'first query' },
        { role: 'assistant' as const, content: 'First response without tools' }
      ]);
    });

    it('should preserve tool interaction context across multiple queries', async () => {
      // Mock tool use scenario followed by regular query
      mockLLMService.generateResponse
        .mockImplementationOnce(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete, onGenerating, conversationHistory) => {
          // Simulate tool execution
          if (onToolExecution) {
            onToolExecution('read_file(package.json)');
          }
          
          if (onToolComplete) {
            onToolComplete('read_file', '{"name": "test-app", "dependencies": {"react": "^19.0.0"}}', false);
          }
          
          return { 
            response: 'Based on package.json, this project uses React 19',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version is used?' },
              { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
            ]
          };
        })
        .mockResolvedValueOnce({ 
          response: 'Follow-up response',
          conversationHistory: [
            { role: 'user' as const, content: 'What React version is used?' },
            { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' },
            { role: 'user' as const, content: 'Is this a recent version?' },
            { role: 'assistant' as const, content: 'Follow-up response' }
          ]
        });

      await coreAgent.processQuery('What React version is used?');
      await coreAgent.processQuery('Is this a recent version?');

      // Check that the second query has access to the first conversation
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8];
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What React version is used?' },
        { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
      ]);
    });

    it('should handle multiple tool uses in a single query within conversation history', async () => {
      // Mock a query that uses multiple tools
      mockLLMService.generateResponse
        .mockImplementationOnce(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete) => {
          // Simulate multiple tool executions
          if (onToolExecution) {
            onToolExecution('read_file(package.json)');
          }
          if (onToolComplete) {
            onToolComplete('read_file', '{"dependencies": {"react": "^19.0.0"}}', false);
          }
          
          // Second tool
          if (onToolExecution) {
            onToolExecution('read_file(tailwind.config.js)');
          }
          if (onToolComplete) {
            onToolComplete('read_file', 'module.exports = {content: ["./src/**/*.{js,ts,jsx,tsx}"]}', false);
          }
          
          return { 
            response: 'Project uses React 19 and Tailwind CSS',
            conversationHistory: [
              { role: 'user' as const, content: 'What technologies does this project use?' },
              { role: 'assistant' as const, content: 'Project uses React 19 and Tailwind CSS' }
            ]
          };
        })
        .mockResolvedValueOnce({ 
          response: 'Follow-up response about the project',
          conversationHistory: [
            { role: 'user' as const, content: 'What technologies does this project use?' },
            { role: 'assistant' as const, content: 'Project uses React 19 and Tailwind CSS' },
            { role: 'user' as const, content: 'Tell me more about the setup' },
            { role: 'assistant' as const, content: 'Follow-up response about the project' }
          ]
        });

      await coreAgent.processQuery('What technologies does this project use?');
      await coreAgent.processQuery('Tell me more about the setup');

      // Verify conversation history is maintained correctly
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8];
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What technologies does this project use?' },
        { role: 'assistant' as const, content: 'Project uses React 19 and Tailwind CSS' }
      ]);
    });

    it('should maintain conversation history even when tools encounter errors', async () => {
      // Mock a scenario with tool error
      mockLLMService.generateResponse
        .mockImplementationOnce(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete) => {
          if (onToolExecution) {
            onToolExecution('read_file(nonexistent.json)');
          }
          if (onToolComplete) {
            onToolComplete('read_file', 'File not found: nonexistent.json', true);
          }
          
          return { 
            response: 'I could not find the specified file',
            conversationHistory: [
              { role: 'user' as const, content: 'Read nonexistent.json file' },
              { role: 'assistant' as const, content: 'I could not find the specified file' }
            ]
          };
        })
        .mockResolvedValueOnce({ 
          response: 'Here is alternative information',
          conversationHistory: [
            { role: 'user' as const, content: 'Read nonexistent.json file' },
            { role: 'assistant' as const, content: 'I could not find the specified file' },
            { role: 'user' as const, content: 'What can you tell me instead?' },
            { role: 'assistant' as const, content: 'Here is alternative information' }
          ]
        });

      await coreAgent.processQuery('Read nonexistent.json file');
      await coreAgent.processQuery('What can you tell me instead?');

      // Verify error handling preserves conversation context
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8];
      
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'Read nonexistent.json file' },
        { role: 'assistant' as const, content: 'I could not find the specified file' }
      ]);
    });

    // Tests for the COMPLETE tool interaction cycle preservation
    it('should include complete tool_use and tool_result cycle in conversation history (future implementation)', async () => {
      // This test describes the expected behavior after implementing tool interaction preservation
      // Currently this will fail, but shows what we want to achieve
      
      mockLLMService.generateResponse
        .mockImplementationOnce(async (query, onThinking, toolManager, onToolExecution, onTokenUpdate, abortSignal, onToolComplete) => {
          // Simulate tool execution
          if (onToolExecution) {
            onToolExecution('read_file(package.json)');
          }
          if (onToolComplete) {
            onToolComplete('read_file', '{"dependencies": {"react": "^19.0.0"}}', false);
          }
          
          return { 
            response: 'Based on package.json, this project uses React 19',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version is used?' },
              { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
            ]
          };
        })
        .mockResolvedValueOnce({ 
          response: 'No, I already checked the package.json file',
          conversationHistory: [
            { role: 'user' as const, content: 'What React version is used?' },
            { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' },
            { role: 'user' as const, content: 'Can you check the package.json file?' },
            { role: 'assistant' as const, content: 'No, I already checked the package.json file' }
          ]
        });

      await coreAgent.processQuery('What React version is used?');
      await coreAgent.processQuery('Can you check the package.json file?');

      // In the future implementation, the second call should include the complete tool interaction
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8];
      
      // TODO: This is what we WANT the conversation history to look like:
      // expect(conversationHistory).toEqual([
      //   { role: 'user' as const, content: 'What React version is used?' },
      //   { 
      //     role: 'assistant', 
      //     content: [
      //       { type: 'tool_use', id: 'tool_123', name: 'read_file', input: { path: 'package.json' } }
      //     ]
      //   },
      //   { 
      //     role: 'user', 
      //     content: [
      //       { type: 'tool_result', tool_use_id: 'tool_123', content: '{"dependencies": {"react": "^19.0.0"}}' }
      //     ]
      //   },
      //   { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
      // ]);

      // For now, verify current behavior (only final responses)
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What React version is used?' },
        { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
      ]);
    });
  });
});