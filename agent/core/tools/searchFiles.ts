import { spawn } from 'child_process';
import { resolve } from 'path';
import { Tool } from '../../types/index.js';

export const searchFilesTool: Tool = {
  name: 'search_files',
  description: 'Search for text content within files using ripgrep',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text or regex pattern to search for'
      },
      path: {
        type: 'string',
        description: 'Directory path to search in (defaults to current directory)',
        default: '.'
      },
      filePattern: {
        type: 'string',
        description: 'File pattern to include (e.g., "*.ts", "*.{js,ts}")'
      },
      regex: {
        type: 'boolean',
        description: 'Treat query as regex pattern',
        default: false
      }
    },
    required: ['query']
  },
  execute: async (params: Record<string, any>, abortSignal?: AbortSignal) => {
    try {
      if (!params.query) {
        return 'Error: Search query is required';
      }

      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }

      const searchPath = resolve(params.path || '.');
      const args: string[] = [];

      // Basic ripgrep options
      args.push('--color=never'); // No color output
      args.push('--heading'); // Group matches by file
      args.push('--with-filename'); // Show filename

      // Always include line numbers
      args.push('--line-number');

      // Always case insensitive
      args.push('--ignore-case');

      // Regex mode
      if (params.regex) {
        args.push('--regexp');
      } else {
        args.push('--fixed-strings');
      }

      // Max 10 results
      args.push('--max-count=10');

      // File patterns
      if (params.filePattern) {
        args.push('--glob', params.filePattern);
      }

      // Respect gitignore
      args.push('--ignore-dot');
      args.push('--ignore-global');

      // Add the search query
      args.push(params.query);

      // Add the search path
      args.push(searchPath);

      // Import ripgrep path
      const { rgPath } = await import('@vscode/ripgrep');

      return new Promise<string>((resolve, reject) => {
        const rg = spawn(rgPath, args);
        let stdout = '';
        let stderr = '';

        // Handle abort signal
        const onAbort = () => {
          rg.kill('SIGTERM');
          reject(new Error('Search operation was cancelled'));
        };

        if (abortSignal) {
          abortSignal.addEventListener('abort', onAbort);
        }

        rg.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        rg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        rg.on('close', (code) => {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', onAbort);
          }

          if (code === 0) {
            if (stdout.trim()) {
              resolve(`Search results for "${params.query}":\n\n${stdout}`);
            } else {
              resolve(`No matches found for "${params.query}"`);
            }
          } else if (code === 1) {
            // No matches found (ripgrep exit code 1)
            resolve(`No matches found for "${params.query}"`);
          } else {
            // Error occurred
            const errorMsg = stderr || `ripgrep exited with code ${code}`;
            reject(new Error(`Search failed: ${errorMsg}`));
          }
        });

        rg.on('error', (error) => {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', onAbort);
          }
          reject(new Error(`Failed to start search: ${error.message}`));
        });
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'Error: Search was cancelled';
      }
      return `Error during search: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};