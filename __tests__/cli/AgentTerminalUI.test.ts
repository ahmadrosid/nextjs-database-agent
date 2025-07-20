import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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

import { AgentTerminalUI } from '../../agent/cli/AgentTerminalUI';

// Mock Ink components
jest.mock('ink', () => ({
  render: jest.fn(),
  Box: jest.fn(({ children }) => children),
  Text: jest.fn(({ children }) => children),
  useInput: jest.fn(),
}));

// Mock text input component
jest.mock('../../agent/cli/text-input', () => ({
  TextInput: jest.fn(),
  useTextInput: jest.fn(() => ({ inputValue: 'test' })),
}));


describe('AgentTerminalUI', () => {
  let cli: AgentTerminalUI;
  let mockRender: jest.Mock;
  let mockChalk: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get mocked functions
    mockRender = require('ink').render;
    mockChalk = require('chalk');
    
    // Create new CLI instance
    cli = new AgentTerminalUI();
  });

  describe('constructor', () => {
    it('should create a new AgentTerminalUI instance', () => {
      expect(cli).toBeInstanceOf(AgentTerminalUI);
    });
  });

  describe('start method', () => {
    it('should log startup message with chalk.gray', () => {
      // Mock console.log to track calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cli.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Starting Database Agent CLI...');
      expect(mockChalk.gray).toHaveBeenCalledWith('Starting Database Agent CLI...');
      
      consoleSpy.mockRestore();
    });

    it('should call render function from Ink', () => {
      // Mock console.log to avoid output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cli.start();
      
      expect(mockRender).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledWith(expect.any(Object));
      
      consoleSpy.mockRestore();
    });
  });

  describe('integration', () => {
    it('should initialize and start the CLI properly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Should not throw any errors
      expect(() => {
        cli.start();
      }).not.toThrow();
      
      // Should call the expected functions
      expect(mockChalk.gray).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});