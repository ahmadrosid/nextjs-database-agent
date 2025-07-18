import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock globby to avoid ES module issues
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

// Mock chalk to avoid dependency issues
jest.mock('chalk', () => {
  const chalk = jest.fn((text) => text);
  chalk.blue = jest.fn((text) => text);
  chalk.green = jest.fn((text) => text);
  chalk.red = jest.fn((text) => text);
  chalk.yellow = jest.fn((text) => text);
  chalk.gray = jest.fn((text) => text);
  chalk.dim = { gray: { strikethrough: jest.fn((text) => text) } };
  chalk.bold = jest.fn((text) => text);
  chalk.italic = jest.fn((text) => text);
  chalk.underline = jest.fn((text) => text);
  chalk.reset = jest.fn((text) => text);
  return chalk;
});

import { AgentCLI } from '../../agent/cli/AgentCLI';

// Mock Ink components
jest.mock('ink', () => ({
  render: jest.fn(),
  Box: jest.fn(({ children }) => children),
  Text: jest.fn(({ children }) => children),
  useInput: jest.fn(),
}));

// Mock ink-text-input
jest.mock('ink-text-input', () => ({
  default: jest.fn(),
}));

describe('CLI Integration Tests', () => {
  let cli: AgentCLI;
  let mockRender: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRender = require('ink').render;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    cli = new AgentCLI();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Full CLI Flow', () => {
    it('should start CLI and render the interface', () => {
      cli.start();

      // Should log startup message
      expect(consoleSpy).toHaveBeenCalledWith('Starting Database Agent CLI...');
      
      // Should render the Ink app
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle multiple start calls gracefully', () => {
      cli.start();
      cli.start();

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(mockRender).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle render errors gracefully', () => {
      mockRender.mockImplementation(() => {
        throw new Error('Render error');
      });

      expect(() => {
        cli.start();
      }).toThrow('Render error');

      expect(consoleSpy).toHaveBeenCalledWith('Starting Database Agent CLI...');
    });
  });

  describe('CLI Class Behavior', () => {
    it('should be instantiable multiple times', () => {
      const cli1 = new AgentCLI();
      const cli2 = new AgentCLI();

      expect(cli1).toBeInstanceOf(AgentCLI);
      expect(cli2).toBeInstanceOf(AgentCLI);
      expect(cli1).not.toBe(cli2);
    });

    it('should have start method available', () => {
      expect(cli.start).toBeDefined();
      expect(typeof cli.start).toBe('function');
    });
  });
});