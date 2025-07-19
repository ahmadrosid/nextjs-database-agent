import { LLMService } from '../../agent/core/llm';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK and dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('../../agent/core/tools/index');
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

describe('LLMService Tool Use and Infinite Loop Prevention', () => {
  let llmService: LLMService;
  let mockAnthropicClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Anthropic client
    mockAnthropicClient = {
      messages: {
        stream: jest.fn() as jest.MockedFunction<any>,
        create: jest.fn() as jest.MockedFunction<any>
      }
    } as any;
    
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropicClient);
    
    llmService = new LLMService();
  });

  describe('Max Tool Cycles Prevention', () => {
    it('should prevent infinite loops by limiting tool cycles to 20', async () => {
      // Create a scenario that would cause infinite tool calling
      const createInfiniteToolResponse = () => ({
        content: [{ 
          type: 'tool_use', 
          id: `tool_${Date.now()}`, 
          name: 'read_file', 
          input: { path: 'test.txt' } 
        }],
        stop_reason: 'tool_use' // This causes recursion
      });

      // Mock streaming response that starts the tool use
      const mockStreamEvents = [
        { type: 'message_start', message: { usage: { input_tokens: 100 } } },
        { 
          type: 'content_block_start', 
          content_block: { 
            type: 'tool_use', 
            id: 'initial_tool', 
            name: 'read_file', 
            input: { path: 'test.txt' } 
          } 
        },
        { type: 'content_block_stop' },
        { type: 'message_delta', usage: { output_tokens: 50 } }
      ];

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockStreamEvents[0], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[1], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[2], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[3], done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      };

      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);

      // Mock tool execution that always succeeds
      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({
          result: 'File content here',
          error: null
        }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([{
          name: 'read_file',
          description: 'Read a file',
          input_schema: { type: 'object', properties: {} }
        }])
      };

      // Mock the create method to always return tool_use responses (infinite loop scenario)
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => 
        Promise.resolve(createInfiniteToolResponse())
      );

      // Test that the system throws an error after 20 cycles
      await expect(
        llmService.generateResponse(
          'Keep reading files until you find something',
          undefined, // onThinking
          mockToolManager as any,
          jest.fn(), // onToolExecution
          undefined, // abortSignal
          jest.fn(), // onToolComplete
          jest.fn(), // onGenerating
          [] // empty conversation history
        )
      ).rejects.toThrow('Maximum tool cycles (20) exceeded. The agent may be stuck in a loop.');

      // Verify that the tool was called 20 times before the error
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(20);
    });

    it('should reset tool cycle counter for new queries', async () => {
      // Mock a normal response that uses 3 tool cycles then stops
      const toolResponses = [
        { content: [{ type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'file1.txt' } }], stop_reason: 'tool_use' },
        { content: [{ type: 'tool_use', id: 'tool_2', name: 'read_file', input: { path: 'file2.txt' } }], stop_reason: 'tool_use' },
        { content: [{ type: 'text', text: 'Done reading files' }], stop_reason: 'end_turn' }
      ];

      let callCount = 0;
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => {
        const response = toolResponses[callCount];
        callCount++;
        return Promise.resolve(response);
      });

      // Mock streaming for initial response
      const mockStreamEvents = [
        { type: 'message_start', message: { usage: { input_tokens: 100 } } },
        { 
          type: 'content_block_start', 
          content_block: { 
            type: 'tool_use', 
            id: 'initial_tool', 
            name: 'read_file', 
            input: { path: 'start.txt' } 
          } 
        },
        { type: 'content_block_stop' }
      ];

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockStreamEvents[0], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[1], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[2], done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      };

      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({ result: 'File content', error: null }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([{
          name: 'read_file',
          description: 'Read a file',
          input_schema: { type: 'object', properties: {} }
        }])
      };

      // First query - should complete successfully
      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);
      
      const response1 = await llmService.generateResponse(
        'Read some files',
        undefined,
        mockToolManager as any,
        jest.fn(),
        undefined,
        jest.fn(),
        jest.fn(),
        []
      );

      expect(response1.response).toBe('Done reading files');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);

      // Reset mocks for second query
      jest.clearAllMocks();
      callCount = 0;

      // Second query - should also work (counter should be reset)
      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => {
        const response = toolResponses[callCount];
        callCount++;
        return Promise.resolve(response);
      });

      const response2 = await llmService.generateResponse(
        'Read more files',
        undefined,
        mockToolManager as any,
        jest.fn(),
        undefined,
        jest.fn(),
        jest.fn(),
        []
      );

      expect(response2.response).toBe('Done reading files');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should allow normal tool use up to 19 cycles without error', async () => {
      // Create responses that use exactly 19 tool cycles then stop
      const toolResponses = Array.from({ length: 19 }, (_, i) => ({
        content: [{ type: 'tool_use', id: `tool_${i}`, name: 'read_file', input: { path: `file${i}.txt` } }],
        stop_reason: 'tool_use'
      }));
      
      // Final response that stops the loop
      toolResponses.push({
        content: [{ type: 'text', text: 'Finished processing all files' }],
        stop_reason: 'end_turn'
      });

      let callCount = 0;
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => {
        const response = toolResponses[callCount];
        callCount++;
        return Promise.resolve(response);
      });

      // Mock streaming for initial response
      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'initial', name: 'read_file', input: { path: 'start.txt' } } },
        { type: 'content_block_stop' }
      ];

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockStreamEvents[0], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[1], done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      };

      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);

      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({ result: 'File content', error: null }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([{
          name: 'read_file',
          description: 'Read a file',
          input_schema: { type: 'object', properties: {} }
        }])
      };

      // Should complete successfully without throwing
      const response = await llmService.generateResponse(
        'Process many files',
        undefined,
        mockToolManager as any,
        jest.fn(),
        undefined,
        jest.fn(),
        jest.fn(),
        []
      );

      expect(response.response).toBe('Finished processing all files');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(20); // 19 tool cycles + 1 final response
    });

    it('should handle abort signal during tool cycles', async () => {
      const abortController = new AbortController();
      
      // Mock infinite tool responses
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => {
        // Abort after a few calls
        if ((mockAnthropicClient.messages.create as jest.Mock).mock.calls.length === 3) {
          abortController.abort();
        }
        return Promise.resolve({
          content: [{ type: 'tool_use', id: 'tool_infinite', name: 'read_file', input: { path: 'test.txt' } }],
          stop_reason: 'tool_use'
        });
      });

      // Mock streaming response
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: jest.fn()
            .mockResolvedValueOnce({ value: { type: 'content_block_start', content_block: { type: 'tool_use', id: 'initial', name: 'read_file', input: { path: 'start.txt' } } }, done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      };

      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);

      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({ result: 'File content', error: null }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([])
      };

      // Should throw AbortError before hitting max cycles
      await expect(
        llmService.generateResponse(
          'Keep processing',
          undefined,
          mockToolManager as any,
          jest.fn(),
          abortController.signal,
          jest.fn(),
          jest.fn(),
          []
        )
      ).rejects.toThrow('Operation was cancelled');
    });
  });

  describe('Tool Cycle Counter Integration', () => {
    it('should increment counter for both streaming and recursive tool use', async () => {
      // This test verifies that the counter works in both code paths:
      // 1. Initial streaming response with tool use
      // 2. Recursive handleToolUse calls

      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'stream_tool', name: 'read_file', input: { path: 'stream.txt' } } },
        { type: 'content_block_stop' }
      ];

      const mockAsyncIterator = {
        [Symbol.asyncIterator]: () => ({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockStreamEvents[0], done: false })
            .mockResolvedValueOnce({ value: mockStreamEvents[1], done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      };

      (mockAnthropicClient.messages.stream as jest.Mock).mockReturnValueOnce(mockAsyncIterator as any);

      // Mock one recursive call then stop
      (mockAnthropicClient.messages.create as jest.Mock)
        .mockResolvedValueOnce({
          content: [{ type: 'tool_use', id: 'recursive_tool', name: 'read_file', input: { path: 'recursive.txt' } }],
          stop_reason: 'tool_use'
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'All done' }],
          stop_reason: 'end_turn'
        });

      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({ result: 'File content', error: null }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([])
      };

      const response = await llmService.generateResponse(
        'Read files',
        undefined,
        mockToolManager as any,
        jest.fn(),
        undefined,
        jest.fn(),
        jest.fn(),
        []
      );

      expect(response.response).toBe('All done');
      // Should have: 1 initial tool use + 1 recursive call = 2 total tool cycles
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
    });
  });
});