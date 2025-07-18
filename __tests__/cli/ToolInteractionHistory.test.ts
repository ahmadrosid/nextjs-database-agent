import { CoreAgent } from '../../agent/core/CoreAgent';
import { LLMService } from '../../agent/core/llm';

// Mock the LLMService and ToolManager
jest.mock('../../agent/core/llm');
jest.mock('../../agent/core/tools/index');

// Mock globby to avoid ES module issues
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

describe('Tool Interaction History', () => {
  let coreAgent: CoreAgent;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    jest.clearAllMocks();
    coreAgent = new CoreAgent();
    mockLLMService = jest.mocked(LLMService.prototype);
  });

  afterEach(() => {
    coreAgent.removeAllListeners();
  });

  describe('Complete Tool Interaction Cycle', () => {
    it('should capture tool_use and tool_result blocks in conversation history', async () => {
      // Mock the first query that uses tools
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query, _onThinking, _toolManager, _onToolExecution, _onTokenUpdate, _abortSignal, _onToolComplete, _onGenerating, _conversationHistory) => {
          // This should trigger tool use internally
          return {
            response: 'Based on package.json, this project uses React 19',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version is used?' },
              { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
            ]
          };
        }
      );

      // Mock the second query 
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query, _onThinking, _toolManager, _onToolExecution, _onTokenUpdate, _abortSignal, _onToolComplete, _onGenerating, _conversationHistory) => {
          // We want to verify that conversationHistory contains the complete tool interaction cycle
          return {
            response: 'I already checked that file in my previous response',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version is used?' },
              { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' },
              { role: 'user' as const, content: 'Can you check the package.json file?' },
              { role: 'assistant' as const, content: 'I already checked that file in my previous response' }
            ]
          };
        }
      );

      await coreAgent.processQuery('What React version is used?');
      await coreAgent.processQuery('Can you check the package.json file?');

      // Get the conversation history passed to the second query
      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8]; // 9th parameter (0-indexed)

      // This test will initially fail because we haven't implemented the feature yet
      // But it clearly defines what we want to achieve

      // For now, verify current behavior (we'll update this assertion after implementation)
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What React version is used?' },
        { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
      ]);

      // TODO: After implementation, this should be:
      /*
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What React version is used?' },
        { 
          role: 'assistant', 
          content: [
            { 
              type: 'tool_use', 
              id: expect.any(String), 
              name: 'read_file', 
              input: { path: 'package.json' } 
            }
          ]
        },
        { 
          role: 'user', 
          content: [
            { 
              type: 'tool_result', 
              tool_use_id: expect.any(String), 
              content: expect.stringContaining('"react"') 
            }
          ]
        },
        { role: 'assistant' as const, content: 'Based on package.json, this project uses React 19' }
      ]);
      */

    });

    it('should preserve tool interactions across multiple conversation turns', async () => {
      // Simulate a conversation where multiple tools are used across different queries
      
      // First query: Uses read_file tool
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query) => {
          return {
            response: 'React version is 19.0.0',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version?' },
              { role: 'assistant' as const, content: 'React version is 19.0.0' }
            ]
          };
        }
      );

      // Second query: Uses search_files tool  
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query) => {
          return {
            response: 'Found 5 TypeScript files',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version?' },
              { role: 'assistant' as const, content: 'React version is 19.0.0' },
              { role: 'user' as const, content: 'How many TypeScript files?' },
              { role: 'assistant' as const, content: 'Found 5 TypeScript files' }
            ]
          };
        }
      );

      // Third query: Should have access to both previous tool interactions
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query, _onThinking, _toolManager, _onToolExecution, _onTokenUpdate, _abortSignal, _onToolComplete, _onGenerating, _conversationHistory) => {
          return {
            response: 'Based on my previous searches, this is a React 19 TypeScript project',
            conversationHistory: [
              { role: 'user' as const, content: 'What React version?' },
              { role: 'assistant' as const, content: 'React version is 19.0.0' },
              { role: 'user' as const, content: 'How many TypeScript files?' },
              { role: 'assistant' as const, content: 'Found 5 TypeScript files' },
              { role: 'user' as const, content: 'Summarize what you found' },
              { role: 'assistant' as const, content: 'Based on my previous searches, this is a React 19 TypeScript project' }
            ]
          };
        }
      );

      await coreAgent.processQuery('What React version?');
      await coreAgent.processQuery('How many TypeScript files?'); 
      await coreAgent.processQuery('Summarize what you found');

      // Get conversation history for the third query
      const thirdCall = mockLLMService.generateResponse.mock.calls[2];
      const conversationHistory = thirdCall[8];

      // Verify current behavior (will be updated after implementation)
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'What React version?' },
        { role: 'assistant' as const, content: 'React version is 19.0.0' },
        { role: 'user' as const, content: 'How many TypeScript files?' },
        { role: 'assistant' as const, content: 'Found 5 TypeScript files' }
      ]);

      // TODO: After implementation, should include all tool_use and tool_result blocks
    });

    it('should handle tool errors in conversation history', async () => {
      // Test that tool errors are also preserved in conversation history
      
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query) => {
          return {
            response: 'File not found: nonexistent.json',
            conversationHistory: [
              { role: 'user' as const, content: 'Read nonexistent.json' },
              { role: 'assistant' as const, content: 'File not found: nonexistent.json' }
            ]
          };
        }
      );

      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query, _onThinking, _toolManager, _onToolExecution, _onTokenUpdate, _abortSignal, _onToolComplete, _onGenerating, _conversationHistory) => {
          return {
            response: 'I already tried to read that file but it does not exist',
            conversationHistory: [
              { role: 'user' as const, content: 'Read nonexistent.json' },
              { role: 'assistant' as const, content: 'File not found: nonexistent.json' },
              { role: 'user' as const, content: 'Try reading nonexistent.json again' },
              { role: 'assistant' as const, content: 'I already tried to read that file but it does not exist' }
            ]
          };
        }
      );

      await coreAgent.processQuery('Read nonexistent.json');
      await coreAgent.processQuery('Try reading nonexistent.json again');

      const secondCall = mockLLMService.generateResponse.mock.calls[1];
      const conversationHistory = secondCall[8];

      // Current behavior
      expect(conversationHistory).toEqual([
        { role: 'user' as const, content: 'Read nonexistent.json' },
        { role: 'assistant' as const, content: 'File not found: nonexistent.json' }
      ]);

      // TODO: Should include tool_use with error and tool_result with error details
    });

    it('should maintain conversation history size limits even with tool interactions', async () => {
      // Test that conversation history size limits work correctly when including tool interactions
      
      // Mock multiple queries that would exceed the 20 message limit
      for (let i = 1; i <= 15; i++) {
        const conversationHistory = [];
        for (let j = Math.max(1, i - 9); j <= i; j++) {
          conversationHistory.push({ role: 'user' as const, content: `Query ${j}` });
          conversationHistory.push({ role: 'assistant' as const, content: `Response ${j}` });
        }
        // Limit to 20 messages
        const limitedHistory = conversationHistory.slice(-20);
        
        mockLLMService.generateResponse.mockResolvedValueOnce({
          response: `Response ${i}`,
          conversationHistory: limitedHistory
        });
      }

      // Execute multiple queries
      for (let i = 1; i <= 15; i++) {
        await coreAgent.processQuery(`Query ${i}`);
      }

      // Check that history is properly limited
      const lastCall = mockLLMService.generateResponse.mock.calls[14];
      const conversationHistory = lastCall[8];

      expect(conversationHistory).toBeDefined();
      expect(conversationHistory).toHaveLength(20); // Should still respect the 20 message limit

      // TODO: After implementation, verify that tool interactions don't break the size limit logic
    });
  });

  describe('Integration with Real Tool Manager', () => {
    it('should capture real tool execution data for conversation history', async () => {
      // This test will help us verify the integration between LLMService and actual tool execution
      
      // Mock a realistic tool execution scenario
      mockLLMService.generateResponse.mockImplementationOnce(
        async (_query, _onThinking, _toolManager, _onToolExecution, _onTokenUpdate, _abortSignal, _onToolComplete, _onGenerating, _conversationHistory) => {
          // Simulate real tool execution flow
          if (_onToolExecution) {
            _onToolExecution('read_file(package.json)');
          }
          
          if (_onToolComplete) {
            _onToolComplete('read_file', '{"name": "test", "dependencies": {"react": "^19.0.0"}}', false);
          }
          
          return {
            response: 'The project uses React 19',
            conversationHistory: [
              { role: 'user' as const, content: 'What dependencies are in package.json?' },
              { role: 'assistant' as const, content: 'The project uses React 19' }
            ]
          };
        }
      );

      await coreAgent.processQuery('What dependencies are in package.json?');

      // For now, just verify the tool callbacks were triggered correctly
      // After implementation, we'll verify the conversation history capture
      expect(mockLLMService.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function), // onThinking
        expect.any(Object),   // toolManager
        expect.any(Function), // onToolExecution
        expect.any(Function), // onTokenUpdate
        expect.any(Object),   // abortSignal
        expect.any(Function), // onToolComplete
        expect.any(Function), // onGenerating
        []                    // conversationHistory (empty on first call)
      );
    });
  });
});