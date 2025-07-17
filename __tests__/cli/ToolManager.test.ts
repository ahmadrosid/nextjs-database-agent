import { ToolManager } from '../../lib/agent/core/tools/index';
import { ToolCall, ToolResult } from '../../lib/agent/types/index';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { exec } from 'child_process';

// Mock fs/promises, globby, and child_process to avoid file system dependencies
jest.mock('fs/promises');
jest.mock('globby', () => ({
  globby: jest.fn()
}));
jest.mock('child_process');

const mockReadFile = jest.mocked(readFile);
const mockWriteFile = jest.mocked(writeFile);
const mockMkdir = jest.mocked(mkdir);
const mockExec = jest.mocked(exec);
const mockGlobby = require('globby').globby;

describe('ToolManager', () => {
  let toolManager: ToolManager;

  beforeEach(() => {
    jest.clearAllMocks();
    toolManager = new ToolManager();
  });

  describe('Tool Registration', () => {
    it('should register all tools by default', () => {
      const availableTools = toolManager.getAvailableTools();
      
      expect(availableTools).toHaveLength(4);
      expect(availableTools.map(tool => tool.name)).toContain('list_files');
      expect(availableTools.map(tool => tool.name)).toContain('read_file');
      expect(availableTools.map(tool => tool.name)).toContain('write_file');
      expect(availableTools.map(tool => tool.name)).toContain('bash_command');
    });

    it('should provide tool descriptions for LLM', () => {
      const toolsDescription = toolManager.getToolsForLLM();
      
      expect(toolsDescription).toContain('list_files');
      expect(toolsDescription).toContain('read_file');
      expect(toolsDescription).toContain('write_file');
      expect(toolsDescription).toContain('bash_command');
      expect(toolsDescription).toContain('Description:');
      expect(toolsDescription).toContain('Parameters:');
    });
  });

  describe('Tool Execution', () => {
    it('should execute list_files tool successfully', async () => {
      const mockFiles = ['file1.js', 'file2.ts', 'dir1/'];
      mockGlobby.mockResolvedValue(mockFiles);

      const toolCall: ToolCall = {
        name: 'list_files',
        parameters: { path: '.' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('list_files');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Files in . (3 items)');
      expect(result.result).toContain('file1.js');
      expect(mockGlobby).toHaveBeenCalledWith(['**/*'], {
        cwd: expect.any(String),
        gitignore: true,
        dot: false,
        onlyFiles: false,
        markDirectories: true,
        absolute: false
      });
    });

    it('should execute read_file tool successfully', async () => {
      const mockContent = 'File content here';
      mockReadFile.mockResolvedValue(mockContent);

      const toolCall: ToolCall = {
        name: 'read_file',
        parameters: { path: 'test.txt' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('read_file');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Contents of test.txt');
      expect(result.result).toContain(mockContent);
      expect(mockReadFile).toHaveBeenCalledWith(resolve('test.txt'), 'utf-8');
    });

    it('should handle list_files with custom parameters', async () => {
      const mockFiles = ['src/index.ts', 'src/utils.ts'];
      mockGlobby.mockResolvedValue(mockFiles);

      const toolCall: ToolCall = {
        name: 'list_files',
        parameters: { 
          path: './src',
          pattern: '*.ts',
          includeHidden: true
        }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('list_files');
      expect(result.error).toBeUndefined();
      expect(mockGlobby).toHaveBeenCalledWith(['*.ts'], {
        cwd: expect.stringContaining('src'),
        gitignore: true,
        dot: true,
        onlyFiles: false,
        markDirectories: true,
        absolute: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should return error for unknown tool', async () => {
      const toolCall: ToolCall = {
        name: 'unknown_tool',
        parameters: {}
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('unknown_tool');
      expect(result.result).toBe('');
      expect(result.error).toBe("Tool 'unknown_tool' not found");
    });

    it('should handle file read errors gracefully', async () => {
      const errorMessage = 'File not found';
      mockReadFile.mockRejectedValue(new Error(errorMessage));

      const toolCall: ToolCall = {
        name: 'read_file',
        parameters: { path: 'nonexistent.txt' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('read_file');
      expect(result.result).toContain('Error reading file');
      expect(result.result).toContain(errorMessage);
      expect(result.error).toBeUndefined(); // Error is in result, not error field
    });

    it('should handle list_files errors gracefully', async () => {
      const errorMessage = 'Permission denied';
      mockGlobby.mockRejectedValue(new Error(errorMessage));

      const toolCall: ToolCall = {
        name: 'list_files',
        parameters: { path: '/restricted' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('list_files');
      expect(result.result).toContain('Error listing files');
      expect(result.result).toContain(errorMessage);
      expect(result.error).toBeUndefined();
    });

    it('should handle missing required parameters', async () => {
      const toolCall: ToolCall = {
        name: 'read_file',
        parameters: {} // Missing required 'path' parameter
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('read_file');
      expect(result.result).toContain('Error: File path is required');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Tool Information', () => {
    it('should provide correct tool information', () => {
      const tools = toolManager.getAvailableTools();
      
      const listFilesTool = tools.find(tool => tool.name === 'list_files');
      const readFileTool = tools.find(tool => tool.name === 'read_file');

      expect(listFilesTool).toBeDefined();
      expect(listFilesTool?.description).toContain('List files and directories');
      expect(listFilesTool?.parameters).toHaveProperty('properties');

      expect(readFileTool).toBeDefined();
      expect(readFileTool?.description).toContain('Read the contents of a file');
      expect(readFileTool?.parameters).toHaveProperty('properties');
      expect(readFileTool?.parameters.required).toContain('path');
    });

    it('should format tools for LLM consumption', () => {
      const llmDescription = toolManager.getToolsForLLM();
      
      expect(llmDescription).toContain('Tool: list_files');
      expect(llmDescription).toContain('Tool: read_file');
      expect(llmDescription).toContain('Description: List files and directories');
      expect(llmDescription).toContain('Description: Read the contents of a file');
      expect(llmDescription).toContain('Parameters:');
    });
  });

  describe('File Operations Edge Cases', () => {
    it('should handle empty file list', async () => {
      mockGlobby.mockResolvedValue([]);

      const toolCall: ToolCall = {
        name: 'list_files',
        parameters: { pattern: '*.nonexistent' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.result).toContain('No files found matching pattern');
      expect(result.error).toBeUndefined();
    });

    it('should handle empty file content', async () => {
      mockReadFile.mockResolvedValue('');

      const toolCall: ToolCall = {
        name: 'read_file',
        parameters: { path: 'empty.txt' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.result).toContain('Contents of empty.txt');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Write File Tool', () => {
    it('should execute write_file tool successfully', async () => {
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'write_file',
        parameters: { 
          path: 'test.txt',
          content: 'Hello World'
        }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('write_file');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Successfully wrote 11 characters to test.txt');
      expect(mockWriteFile).toHaveBeenCalledWith(resolve('test.txt'), 'Hello World', 'utf-8');
      expect(mockMkdir).toHaveBeenCalled();
    });

    it('should handle write_file with createDirs disabled', async () => {
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'write_file',
        parameters: { 
          path: 'test.txt',
          content: 'Hello World',
          createDirs: false
        }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('write_file');
      expect(result.error).toBeUndefined();
      expect(mockWriteFile).toHaveBeenCalledWith(resolve('test.txt'), 'Hello World', 'utf-8');
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    it('should handle write_file errors gracefully', async () => {
      const errorMessage = 'Permission denied';
      mockWriteFile.mockRejectedValue(new Error(errorMessage));

      const toolCall: ToolCall = {
        name: 'write_file',
        parameters: { 
          path: 'restricted.txt',
          content: 'Hello World'
        }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('write_file');
      expect(result.result).toContain('Error writing file');
      expect(result.result).toContain(errorMessage);
      expect(result.error).toBeUndefined();
    });

    it('should handle missing write_file parameters', async () => {
      const toolCall: ToolCall = {
        name: 'write_file',
        parameters: { path: 'test.txt' } // Missing content
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('write_file');
      expect(result.result).toContain('Error: Content is required');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Bash Command Tool', () => {
    it('should execute allowed bash commands successfully', async () => {
      const mockCallback = jest.fn();
      mockCallback.mockImplementation((callback) => {
        callback(null, { stdout: 'Directory created', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'mkdir -p test-dir' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Command executed successfully: mkdir -p test-dir');
      expect(result.result).toContain('Output: Directory created');
    });

    it('should reject disallowed bash commands', async () => {
      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'ls -la' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.result).toContain('Error: Command not allowed');
      expect(result.result).toContain('mkdir, mv, rm -rf');
      expect(result.error).toBeUndefined();
    });

    it('should reject commands with dangerous characters', async () => {
      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'mkdir test && echo "hack"' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.result).toContain('Error: Command contains forbidden characters');
      expect(result.error).toBeUndefined();
    });

    it('should handle rm -rf commands', async () => {
      const mockCallback = jest.fn();
      mockCallback.mockImplementation((callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'rm -rf test-dir' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Command executed successfully: rm -rf test-dir');
    });

    it('should handle mv commands', async () => {
      const mockCallback = jest.fn();
      mockCallback.mockImplementation((callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'mv oldfile.txt newfile.txt' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.error).toBeUndefined();
      expect(result.result).toContain('Command executed successfully: mv oldfile.txt newfile.txt');
    });

    it('should handle bash command execution errors', async () => {
      const mockCallback = jest.fn();
      const execError = new Error('Command failed') as any;
      execError.code = 1;
      execError.stderr = 'Directory not found';
      mockCallback.mockImplementation((callback) => {
        callback(execError);
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'mkdir /restricted' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.result).toContain('Error: Command failed with exit code 1');
      expect(result.result).toContain('Directory not found');
      expect(result.error).toBeUndefined();
    });

    it('should handle missing command parameter', async () => {
      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: {} // Missing command
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.result).toContain('Error: Command is required');
      expect(result.error).toBeUndefined();
    });

    it('should handle timeout errors', async () => {
      const mockCallback = jest.fn();
      const timeoutError = new Error('Command timed out');
      timeoutError.message = 'timeout';
      mockCallback.mockImplementation((callback) => {
        callback(timeoutError);
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { command: 'mkdir long-running-task' }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.result).toContain('Error: Command timed out (30 second limit)');
      expect(result.error).toBeUndefined();
    });

    it('should use custom working directory', async () => {
      const mockCallback = jest.fn();
      mockCallback.mockImplementation((callback) => {
        callback(null, { stdout: 'Directory created', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback);

      const toolCall: ToolCall = {
        name: 'bash_command',
        parameters: { 
          command: 'mkdir test-dir',
          workingDirectory: '/custom/path'
        }
      };

      const result: ToolResult = await toolManager.executeTool(toolCall);

      expect(result.name).toBe('bash_command');
      expect(result.error).toBeUndefined();
      expect(mockExec).toHaveBeenCalledWith('mkdir test-dir', {
        cwd: resolve('/custom/path'),
        timeout: 30000,
        env: process.env
      });
    });
  });
});