import { diffEditTool } from '../../agent/core/tools/diffEdit';
import { ToolCall, ToolResult } from '../../agent/types/index';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

// Mock fs/promises and the diff-apply module
jest.mock('fs/promises');
jest.mock('../../agent/core/diff-edits/diff-apply', () => ({
  constructNewFileContent: jest.fn()
}));

const mockReadFile = jest.mocked(readFile);
const mockWriteFile = jest.mocked(writeFile);
const mockConstructNewFileContent = jest.mocked(require('../../agent/core/diff-edits/diff-apply').constructNewFileContent);

describe('diffEditTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct tool name and description', () => {
      expect(diffEditTool.name).toBe('diff_edit');
      expect(diffEditTool.description).toContain('SEARCH/REPLACE blocks');
      expect(diffEditTool.description).toContain('targeted changes');
    });

    it('should have correct parameters schema', () => {
      expect(diffEditTool.parameters.type).toBe('object');
      expect(diffEditTool.parameters.properties).toHaveProperty('file_path');
      expect(diffEditTool.parameters.properties).toHaveProperty('diff_content');
      expect(diffEditTool.parameters.properties).toHaveProperty('is_final_chunk');
      expect(diffEditTool.parameters.required).toEqual(['file_path', 'diff_content']);
    });
  });

  describe('Basic Functionality', () => {
    it('should successfully apply diff to existing file', async () => {
      const originalContent = 'function hello() {\n  console.log("Hello");\n}';
      const modifiedContent = 'function hello() {\n  console.log("Hello World");\n}';
      const diffContent = `------- SEARCH
  console.log("Hello");
=======
  console.log("Hello World");
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: modifiedContent,
        replacements: [{
          start: 20,
          end: 42,
          content: '  console.log("Hello World");\n',
          method: 'exact_match',
          similarity: 1.0,
          searchContent: '  console.log("Hello");\n',
          matchedText: '  console.log("Hello");\n'
        }]
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Successfully applied diff edits');
      expect(result).toContain('Applied 1 replacement');
      expect(result).toContain('exact_match');
      expect(mockReadFile).toHaveBeenCalledWith(resolve('test.js'), 'utf-8');
      expect(mockConstructNewFileContent).toHaveBeenCalledWith(diffContent, originalContent, true);
      expect(mockWriteFile).toHaveBeenCalledWith(resolve('test.js'), modifiedContent, 'utf-8');
    });

    it('should handle new file creation with empty SEARCH block', async () => {
      const newContent = 'console.log("New file");';
      const diffContent = `------- SEARCH
=======
console.log("New file");
+++++++ REPLACE`;

      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      mockConstructNewFileContent.mockResolvedValue({
        content: newContent,
        replacements: [{
          start: 0,
          end: 0,
          content: newContent,
          method: 'empty_new_file',
          similarity: 1.0,
          searchContent: '',
          matchedText: ''
        }]
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'newfile.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Successfully applied diff edits');
      expect(result).toContain('Applied 1 replacement');
      expect(result).toContain('empty_new_file');
      expect(mockConstructNewFileContent).toHaveBeenCalledWith(diffContent, '', true);
      expect(mockWriteFile).toHaveBeenCalledWith(resolve('newfile.js'), newContent, 'utf-8');
    });

    it('should handle multiple replacements', async () => {
      const originalContent = 'function one() {}\nfunction two() {}';
      const modifiedContent = 'function first() {}\nfunction second() {}';
      const diffContent = `------- SEARCH
function one() {}
=======
function first() {}
+++++++ REPLACE

------- SEARCH
function two() {}
=======
function second() {}
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: modifiedContent,
        replacements: [
          {
            start: 0,
            end: 17,
            content: 'function first() {}',
            method: 'exact_match',
            similarity: 1.0,
            searchContent: 'function one() {}',
            matchedText: 'function one() {}'
          },
          {
            start: 18,
            end: 35,
            content: 'function second() {}',
            method: 'exact_match',
            similarity: 1.0,
            searchContent: 'function two() {}',
            matchedText: 'function two() {}'
          }
        ]
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Successfully applied diff edits');
      expect(result).toContain('Applied 2 replacement');
      expect(result).toContain('1. exact_match');
      expect(result).toContain('2. exact_match');
    });
  });

  describe('Error Handling', () => {
    it('should return error when file_path is missing', async () => {
      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          diff_content: 'some diff content'
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toBe('Error: file_path is required');
    });

    it('should return error when diff_content is missing', async () => {
      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js'
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toBe('Error: diff_content is required');
    });

    it('should handle SEARCH block not found errors', async () => {
      const originalContent = 'function hello() {\n  console.log("Hello");\n}';
      const diffContent = `------- SEARCH
  console.log("Goodbye");
=======
  console.log("Hello World");
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockRejectedValue(
        new Error('The SEARCH block:\n  console.log("Goodbye");\n...does not match anything in the file.')
      );

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Error: The SEARCH block');
      expect(result).toContain('does not match anything in the file');
      expect(result).toContain('Tip: Ensure your SEARCH block matches the exact content');
    });

    it('should handle file write errors', async () => {
      const originalContent = 'function hello() {}';
      const diffContent = `------- SEARCH
function hello() {}
=======
function goodbye() {}
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: 'function goodbye() {}',
        replacements: []
      });
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Error: Permission denied');
    });

    it('should handle abort signal during file read', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: 'some diff'
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters, abortController.signal);

      expect(result).toBe('Error: Operation was cancelled');
    });

    it('should handle abort signal during diff construction', async () => {
      const abortController = new AbortController();
      
      mockReadFile.mockResolvedValue('some content');
      mockConstructNewFileContent.mockImplementation(() => {
        abortController.abort();
        return Promise.resolve({ content: 'modified', replacements: [] });
      });

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: 'some diff'
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters, abortController.signal);

      expect(result).toBe('Error: Operation was cancelled');
    });
  });

  describe('Advanced Features', () => {
    it('should handle is_final_chunk parameter', async () => {
      const originalContent = 'function hello() {}';
      const diffContent = 'partial diff content';

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: 'modified content',
        replacements: []
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent,
          is_final_chunk: false
        }
      };

      await diffEditTool.execute(toolCall.parameters);

      expect(mockConstructNewFileContent).toHaveBeenCalledWith(diffContent, originalContent, false);
    });

    it('should default is_final_chunk to true', async () => {
      const originalContent = 'function hello() {}';
      const diffContent = 'diff content';

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: 'modified content',
        replacements: []
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      await diffEditTool.execute(toolCall.parameters);

      expect(mockConstructNewFileContent).toHaveBeenCalledWith(diffContent, originalContent, true);
    });

    it('should handle string return from constructNewFileContent', async () => {
      const originalContent = 'function hello() {}';
      const modifiedContent = 'function goodbye() {}';
      const diffContent = 'some diff';

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue(modifiedContent); // String instead of object
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('Successfully applied diff edits');
      expect(mockWriteFile).toHaveBeenCalledWith(resolve('test.js'), modifiedContent, 'utf-8');
    });
  });

  describe('Fallback Matching', () => {
    it('should report line-trimmed fallback matching', async () => {
      const originalContent = 'function hello() {\n  console.log("Hello");\n}';
      const modifiedContent = 'function hello() {\n  console.log("Hello World");\n}';
      const diffContent = `------- SEARCH
console.log("Hello");
=======
console.log("Hello World");
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: modifiedContent,
        replacements: [{
          start: 20,
          end: 42,
          content: '  console.log("Hello World");\n',
          method: 'line_trimmed_fallback',
          similarity: 1.0,
          searchContent: 'console.log("Hello");\n',
          matchedText: '  console.log("Hello");\n'
        }]
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('line_trimmed_fallback');
    });

    it('should report block anchor fallback matching', async () => {
      const originalContent = 'function hello() {\n  console.log("Hello");\n  return true;\n}';
      const modifiedContent = 'function hello() {\n  console.log("Hello World");\n  return true;\n}';
      const diffContent = `------- SEARCH
function hello() {
  console.log("Hello");
  return true;
}
=======
function hello() {
  console.log("Hello World");
  return true;
}
+++++++ REPLACE`;

      mockReadFile.mockResolvedValue(originalContent);
      mockConstructNewFileContent.mockResolvedValue({
        content: modifiedContent,
        replacements: [{
          start: 0,
          end: 50,
          content: 'function hello() {\n  console.log("Hello World");\n  return true;\n}',
          method: 'block_anchor_fallback',
          similarity: 0.85,
          searchContent: 'function hello() {\n  console.log("Hello");\n  return true;\n}',
          matchedText: 'function hello() {\n  console.log("Hello");\n  return true;\n}'
        }]
      });
      mockWriteFile.mockResolvedValue(undefined);

      const toolCall: ToolCall = {
        name: 'diff_edit',
        parameters: {
          file_path: 'test.js',
          diff_content: diffContent
        }
      };

      const result: ToolResult = await diffEditTool.execute(toolCall.parameters);

      expect(result).toContain('block_anchor_fallback');
    });
  });
});