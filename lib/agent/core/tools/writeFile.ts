import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { Tool } from '../../types/index.js';

export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file, creating directories if needed',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      createDirs: {
        type: 'boolean',
        description: 'Create parent directories if they don\'t exist',
        default: true
      }
    },
    required: ['path', 'content']
  },
  execute: async (params: Record<string, any>) => {
    try {
      if (!params.path) {
        return 'Error: File path is required';
      }
      
      if (params.content === undefined) {
        return 'Error: Content is required';
      }
      
      const filePath = resolve(params.path);
      const createDirs = params.createDirs !== false; // Default to true
      
      // Create parent directories if needed
      if (createDirs) {
        const parentDir = dirname(filePath);
        await mkdir(parentDir, { recursive: true });
      }
      
      // Write the file
      await writeFile(filePath, params.content, 'utf-8');
      
      return `Successfully wrote ${params.content.length} characters to ${params.path}`;
    } catch (error) {
      return `Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};