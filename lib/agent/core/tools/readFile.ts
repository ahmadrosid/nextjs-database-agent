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
        description: 'Path to the file to read',
        required: true
      }
    },
    required: ['path']
  },
  execute: async (params: Record<string, any>) => {
    try {
      if (!params.path) {
        return 'Error: File path is required';
      }
      
      const filePath = resolve(params.path);
      const content = await readFile(filePath, 'utf-8');
      
      return `Contents of ${params.path}:\n${content}`;
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};