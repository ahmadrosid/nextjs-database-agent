# diff-edits

This diff edit algorithm is based on [cline open source diff algorithm](https://github.com/cline/cline/blob/main/evals/diff-edits/diff-apply/diff-06-26-25.ts)

## How it works?

The algorithm processes diffs in a custom format with <<<<<<< SEARCH and >>>>>>> REPLACE blocks to make targeted file changes. It uses three matching strategies:

1. Exact match - Direct string matching
2. Line-trimmed match - Ignoring whitespace differences
3. Block anchor match - Using first/last lines as anchors when middle content differs

Key Features

- Incremental processing - Handles chunked updates across multiple passes
- Flexible matching - Falls back through strategies if exact match fails
- State preservation - Tracks processing state between chunks
- Error handling - Throws errors for unmatched search content

Usage

const result = await constructNewFileContent(
diffContent,   // Your diff with SEARCH/REPLACE blocks
originalFile,  // Current file content  
isFinalChunk  // Whether this is the last chunk
)

SEARCH/REPLACE Format

<<<<<<< SEARCH
old content to find
=======
new content to replace with
>>>>>>> REPLACE

## How to prompt LLM to use this?

To use this diff algorithm with an LLM, you need to train it to output in the specific SEARCH/REPLACE format. Here's how to prompt effectively:

Core Prompt Structure

Tell the LLM to make changes using this exact format:
<<<<<<< SEARCH
[exact content to find]
=======
[replacement content]
>>>>>>> REPLACE

Key Prompting Guidelines

Be explicit about format requirements:
- "Use SEARCH/REPLACE blocks for all edits"
- "SEARCH content must match exactly including whitespace"
- "Include enough context in SEARCH to make matches unique"

Emphasize precision:
- "Copy existing indentation and formatting exactly"
- "Include surrounding lines if needed for unique matching"
- "Don't modify unrelated code"

Handle edge cases:
- For new files: use empty SEARCH block
- For multiple changes: use separate SEARCH/REPLACE blocks
- For insertions: SEARCH for the line above/below insertion point

Example Prompt Template

Make the following changes to the file using SEARCH/REPLACE blocks:

Requirements:
- Use exact content matching in SEARCH blocks
- Include enough context to make searches unique
- Preserve original formatting and indentation
- Use separate blocks for unrelated changes

[Your specific change request]

The LLM learns to output precise, targeted edits that the algorithm can reliably apply without breaking existing code structure.