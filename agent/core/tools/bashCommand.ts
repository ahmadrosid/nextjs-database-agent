import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { Tool } from '../../types/index.js';

const execAsync = promisify(exec);

export const bashCommandTool: Tool = {
  name: 'bash_command',
  description: 'Execute allowed bash commands for file operations and npm package management (mkdir, mv, rm -rf, npm commands). IMPORTANT: Always use --legacy-peer-deps flag with npm install commands to avoid peer dependency conflicts.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Bash command to execute. Allowed commands: mkdir, mv, rm -rf, npm install, npm run, npm start, npm test, npm build'
      },
      workingDirectory: {
        type: 'string',
        description: 'Working directory to execute command in (defaults to current directory)',
        default: '.'
      }
    },
    required: ['command']
  },
  execute: async (params: Record<string, any>, abortSignal?: AbortSignal) => {
    try {
      if (!params.command) {
        return 'Error: Command is required';
      }

      const command = params.command.trim();
      const workingDir = params.workingDirectory || '.';
      
      // Validate command against allowlist
      const allowedCommands = [
        'mkdir',
        'mv',
        'rm -rf',
        'npm install',
        'npm run',
        'npm start',
        'npm test',
        'npm build'
      ];

      // Check if command starts with an allowed command
      const isAllowed = allowedCommands.some(allowedCmd => {
        const cmdParts = command.split(' ');
        if (allowedCmd === 'rm -rf') {
          return cmdParts.length >= 2 && cmdParts[0] === 'rm' && cmdParts[1] === '-rf';
        }
        if (allowedCmd.startsWith('npm ')) {
          const npmSubcommand = allowedCmd.split(' ')[1];
          return cmdParts.length >= 2 && cmdParts[0] === 'npm' && cmdParts[1] === npmSubcommand;
        }
        return cmdParts[0] === allowedCmd;
      });

      if (!isAllowed) {
        return `Error: Command not allowed. Only these commands are permitted: ${allowedCommands.join(', ')}`;
      }

      // Additional security checks
      if (command.includes('&') || command.includes('|') || command.includes(';') || command.includes('`')) {
        return 'Error: Command contains forbidden characters (pipes, semicolons, or backticks)';
      }

      // Resolve working directory
      const absoluteWorkingDir = resolve(workingDir);

      // Execute the command
      const { stdout, stderr } = await execAsync(command, {
        cwd: absoluteWorkingDir,
        timeout: 30000, // 30 second timeout
        env: process.env,
        signal: abortSignal
      });

      let result = `Command executed successfully: ${command}`;
      
      if (stdout) {
        result += `\nOutput: ${stdout.trim()}`;
      }
      
      if (stderr) {
        result += `\nWarnings: ${stderr.trim()}`;
      }

      return result;

    } catch (error) {
      if (error instanceof Error) {
        // Handle abort signal
        if (error.name === 'AbortError') {
          return 'Error: Command was cancelled';
        }
        
        // Handle timeout and other exec errors
        if (error.message.includes('timeout')) {
          return 'Error: Command timed out (30 second limit)';
        }
        
        // Handle command execution errors
        if ('code' in error && 'stderr' in error) {
          const execError = error as any;
          return `Error: Command failed with exit code ${execError.code}\nStderr: ${execError.stderr}`;
        }
        
        return `Error: ${error.message}`;
      }
      
      return 'Error: Unknown error occurred';
    }
  }
};