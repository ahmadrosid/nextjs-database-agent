import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { Tool } from '../../types/index.js';

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      }
    },
    required: ['path']
  },
  execute: async (params: Record<string, any>, abortSignal?: AbortSignal) => {
    try {
      if (!params.path) {
        return 'Error: File path is required';
      }
      
      // Check if operation was aborted before starting
      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }
      
      const filePath = resolve(params.path);
      // Note: Node.js fs.readFile doesn't support AbortSignal, but we check before the operation
      const content = await readFile(filePath, 'utf-8');
      
      return `Contents of ${params.path}:\n${content}`;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'Error: File read was cancelled';
      }
      return `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};