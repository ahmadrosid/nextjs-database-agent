import { globby } from 'globby';
import { resolve, relative, dirname } from 'path';
import { stat } from 'fs/promises';
import { Tool } from '../../types/index.js';

export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files and directories in the current directory or specified path, respecting .gitignore patterns',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list (defaults to current directory)',
        default: '.'
      },
      pattern: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.js", "**/*.ts")',
        default: '**/*'
      },
      includeHidden: {
        type: 'boolean',
        description: 'Include hidden files and directories',
        default: false
      }
    }
  },
  execute: async (params: Record<string, any>, abortSignal?: AbortSignal) => {
    try {
      // Check if operation was aborted before starting
      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }
      
      const targetPath = params.path || '.';
      const pattern = params.pattern || '**/*';
      const includeHidden = params.includeHidden || false;
      
      const absolutePath = resolve(targetPath);
      
      // Use globby to find files respecting gitignore
      const files = await globby([pattern], {
        cwd: absolutePath,
        gitignore: true,
        dot: includeHidden,
        onlyFiles: false, // Include both files and directories
        markDirectories: true, // Mark directories with trailing slash
        absolute: false, // Return relative paths
        ignore: ['.git/**', './agent/**']
      });
      
      // Check if operation was aborted after globby
      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }
      
      // Sort files for better readability
      const sortedFiles = files.sort();
      
      // Format output with file/directory indicators
      const fileList = await Promise.all(
        sortedFiles.map(async (file) => {
          // Check abort signal periodically during processing
          if (abortSignal?.aborted) {
            const abortError = new Error('Operation was cancelled');
            abortError.name = 'AbortError';
            throw abortError;
          }
          
          try {
            const fullPath = resolve(absolutePath, file);
            const stats = await stat(fullPath);
            const type = stats.isDirectory() ? 'DIR' : 'FILE';
            return `${type}: ${file}`;
          } catch {
            // If stat fails, assume it's a file
            return `FILE: ${file}`;
          }
        })
      );
      
      if (fileList.length === 0) {
        return `No files found matching pattern "${pattern}" in ${targetPath}`;
      }
      
      return `Files in ${targetPath} (${fileList.length} items):\n${fileList.join('\n')}`;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'Error: File listing was cancelled';
      }
      return `Error listing files: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};