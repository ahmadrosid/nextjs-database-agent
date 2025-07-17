import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DatabaseAgentCLI } from '../../lib/agent/cli/DatabaseAgentCLI';

// Mock Ink components
jest.mock('ink', () => ({
  render: jest.fn(),
  Box: jest.fn(({ children }) => children),
  Text: jest.fn(({ children }) => children),
  useInput: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
}));

// Mock ink-text-input
jest.mock('ink-text-input', () => ({
  default: jest.fn(({ value, onChange, onSubmit, placeholder }) => ({
    value,
    onChange,
    onSubmit,
    placeholder,
  })),
}));

describe('DatabaseAgentCLI', () => {
  let cli: DatabaseAgentCLI;
  let mockRender: jest.Mock;
  let mockChalk: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get mocked functions
    mockRender = require('ink').render;
    mockChalk = require('chalk');
    
    // Create new CLI instance
    cli = new DatabaseAgentCLI();
  });

  describe('constructor', () => {
    it('should create a new DatabaseAgentCLI instance', () => {
      expect(cli).toBeInstanceOf(DatabaseAgentCLI);
    });
  });

  describe('start method', () => {
    it('should log startup message with chalk.blue', () => {
      // Mock console.log to track calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      cli.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Starting Database Agent CLI...');
      expect(mockChalk.blue).toHaveBeenCalledWith('Starting Database Agent CLI...');
      
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
      expect(mockChalk.blue).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});