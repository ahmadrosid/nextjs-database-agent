import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { Tool } from '../../types/index.js';
import { constructNewFileContent } from '../diff-edits/diff-apply.js';

export const diffEditTool: Tool = {
  name: 'diff_edit',
  description: 'Make precise edits to files using SEARCH/REPLACE blocks. Use this for targeted changes to existing files instead of rewriting entire files. Format: Use ------- SEARCH blocks with exact content to find, followed by ======= separator, then replacement content, ending with +++++++ REPLACE.',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the file to edit'
      },
      diff_content: {
        type: 'string',
        description: 'The diff content in SEARCH/REPLACE format:\n\n------- SEARCH\n[exact content to find]\n=======\n[replacement content]\n+++++++ REPLACE\n\nIMPORTANT RULES:\n- SEARCH content must match exactly including whitespace and indentation\n- Include enough context to make matches unique\n- Use separate SEARCH/REPLACE blocks for unrelated changes\n- For new files, use empty SEARCH block\n- For insertions, SEARCH for the line above/below insertion point'
      },
      is_final_chunk: {
        type: 'boolean',
        description: 'Whether this is the final chunk of the diff (usually true for single edits)',
        default: true
      }
    },
    required: ['file_path', 'diff_content']
  },
  execute: async (params: Record<string, any>, abortSignal?: AbortSignal) => {
    try {
      if (!params.file_path) {
        return 'Error: file_path is required';
      }

      if (!params.diff_content) {
        return 'Error: diff_content is required';
      }

      const filePath = resolve(params.file_path);
      const diffContent = params.diff_content;
      const isFinalChunk = params.is_final_chunk !== false; // Default to true

      // Read the original file content
      let originalContent = '';
      try {
        originalContent = await readFile(filePath, 'utf-8');
      } catch (error) {
        // File doesn't exist - treat as new file
        originalContent = '';
      }

      // Check for abort signal
      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }

      // Apply the diff using the existing algorithm
      const result = await constructNewFileContent(diffContent, originalContent, isFinalChunk);
      
      // Extract the content (the algorithm returns an object with content and debug info)
      const newContent = typeof result === 'string' ? result : result.content;

      // Check for abort signal before writing
      if (abortSignal?.aborted) {
        return 'Error: Operation was cancelled';
      }

      // Write the new content back to the file
      await writeFile(filePath, newContent, 'utf-8');

      // Provide feedback about the changes
      let feedback = `Successfully applied diff edits to ${filePath}`;
      
      // Add debug info if available
      if (typeof result === 'object' && result.replacements) {
        const replacements = result.replacements;
        if (replacements.length > 0) {
          feedback += `\n\nApplied ${replacements.length} replacement(s):`;
          replacements.forEach((replacement, index) => {
            feedback += `\n${index + 1}. ${replacement.method} (${replacement.start}-${replacement.end})`;
          });
        }
      }

      return feedback;

    } catch (error) {
      if (error instanceof Error) {
        // Handle abort signal
        if (error.name === 'AbortError') {
          return 'Error: Operation was cancelled';
        }
        
        // Handle specific diff errors
        if (error.message.includes('SEARCH block')) {
          return `Error: ${error.message}\n\nTip: Ensure your SEARCH block matches the exact content in the file, including whitespace and indentation.`;
        }
        
        return `Error: ${error.message}`;
      }
      
      return 'Error: Unknown error occurred during diff edit';
    }
  }
};