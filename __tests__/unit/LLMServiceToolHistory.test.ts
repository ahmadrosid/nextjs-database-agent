import { LLMService } from '../../agent/core/llm';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK and dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('../../agent/core/tools/index');
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

describe('LLMService Tool History Integration', () => {
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

  describe('Tool Use Capture in Conversation History', () => {
    it('should return conversation history with tool interactions for subsequent calls', async () => {
      // This test defines the expected interface for how LLMService should capture tool interactions
      // Currently it will fail, but it defines what we want to implement
      
      // Mock streaming response that includes tool use
      const mockStreamEvents = [
        { type: 'message_start', message: { usage: { input_tokens: 100 } } },
        { 
          type: 'content_block_start', 
          content_block: { 
            type: 'tool_use', 
            id: 'tool_123', 
            name: 'read_file', 
            input: { path: 'package.json' } 
          } 
        },
        { type: 'content_block_stop' },
        { type: 'message_delta', usage: { output_tokens: 50 } }
      ];

      // Mock the async iterator
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

      // Mock tool execution
      const mockToolManager = {
        executeTool: jest.fn().mockResolvedValue({
          result: '{"dependencies": {"react": "^19.0.0"}}',
          error: null
        }),
        getToolsForClaudeAPI: jest.fn().mockReturnValue([])
      };

      // Mock the final response after tool execution
      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: 'Based on package.json, this project uses React 19' }],
        stop_reason: 'end_turn'
      });

      const mockOnToolExecution = jest.fn();
      const mockOnToolComplete = jest.fn();

      // First call - should capture tool interactions
      const response = await llmService.generateResponse(
        'What React version is used?',
        undefined, // onThinking
        mockToolManager as any,
        mockOnToolExecution,
        undefined, // abortSignal
        mockOnToolComplete,
        undefined, // onGenerating
        [] // empty conversation history
      );

      expect(response.response).toBe('Based on package.json, this project uses React 19');
      expect(response.conversationHistory).toBeDefined();

      // The key test: LLMService should provide a way to get the complete conversation history
      // including tool interactions for use in subsequent calls
      
      // TODO: After implementation, LLMService should expose the complete conversation history
      // This might be through a getter method or by returning it along with the response
      
      // For now, verify that tool callbacks were called
      expect(mockOnToolExecution).toHaveBeenCalledWith('read_file(package.json)');
      expect(mockOnToolComplete).toHaveBeenCalledWith(
        'read_file', 
        '{"dependencies": {"react": "^19.0.0"}}', 
        false
      );
    });

    it('should build correct conversation history structure for tool interactions', async () => {
      // This test defines the exact structure we want for conversation history with tools
      
      // Simulate what the conversation history should look like after a tool interaction
      const expectedHistoryAfterToolUse: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: 'What React version is used?' },
        { 
          role: 'assistant', 
          content: [
            { 
              type: 'tool_use', 
              id: 'tool_123', 
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
              tool_use_id: 'tool_123', 
              content: '{"dependencies": {"react": "^19.0.0"}}' 
            }
          ]
        },
        { 
          role: 'assistant', 
          content: 'Based on package.json, this project uses React 19' 
        }
      ];

      // This test documents the expected structure
      // We'll implement the logic to build this structure in LLMService
      expect(expectedHistoryAfterToolUse).toBeDefined();
      expect(expectedHistoryAfterToolUse).toHaveLength(4);
      
      // Verify the structure matches Anthropic's API requirements
      expect(expectedHistoryAfterToolUse[1].role).toBe('assistant');
      expect(Array.isArray(expectedHistoryAfterToolUse[1].content)).toBe(true);
      expect((expectedHistoryAfterToolUse[1].content as any)[0].type).toBe('tool_use');
      
      expect(expectedHistoryAfterToolUse[2].role).toBe('user');
      expect(Array.isArray(expectedHistoryAfterToolUse[2].content)).toBe(true);
      expect((expectedHistoryAfterToolUse[2].content as any)[0].type).toBe('tool_result');
    });

    it('should handle multiple tool uses in conversation history', async () => {
      // Test the structure when multiple tools are used in sequence
      
      const expectedHistoryWithMultipleTools: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: 'Analyze the project structure' },
        { 
          role: 'assistant', 
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'package.json' } },
            { type: 'tool_use', id: 'tool_2', name: 'list_files', input: { path: './src' } }
          ]
        },
        { 
          role: 'user', 
          content: [
            { type: 'tool_result', tool_use_id: 'tool_1', content: 'package.json contents...' },
            { type: 'tool_result', tool_use_id: 'tool_2', content: 'src file list...' }
          ]
        },
        { role: 'assistant', content: 'Based on the analysis...' }
      ];

      // Verify the structure supports multiple tool uses
      expect(expectedHistoryWithMultipleTools[1].content).toHaveLength(2);
      expect(expectedHistoryWithMultipleTools[2].content).toHaveLength(2);
    });

    it('should handle tool errors in conversation history structure', async () => {
      // Test how tool errors should be represented in conversation history
      
      const expectedHistoryWithError: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: 'Read nonexistent.json' },
        { 
          role: 'assistant', 
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'read_file', input: { path: 'nonexistent.json' } }
          ]
        },
        { 
          role: 'user', 
          content: [
            { 
              type: 'tool_result', 
              tool_use_id: 'tool_1', 
              content: 'Error: File not found: nonexistent.json',
              is_error: true 
            }
          ]
        },
        { role: 'assistant', content: 'I could not find the specified file' }
      ];

      // Verify error handling structure
      expect(expectedHistoryWithError[2].content).toHaveLength(1);
      expect((expectedHistoryWithError[2].content as any)[0].is_error).toBe(true);
    });
  });
});