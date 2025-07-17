import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DatabaseAgentCLI } from '../../lib/agent/cli/DatabaseAgentCLI';

// Mock globby to avoid ES module issues
jest.mock('globby', () => ({
  globby: jest.fn().mockResolvedValue([])
}));

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
  default: jest.fn(),
}));

describe('CLI Integration Tests', () => {
  let cli: DatabaseAgentCLI;
  let mockRender: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRender = require('ink').render;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    cli = new DatabaseAgentCLI();
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
      const cli1 = new DatabaseAgentCLI();
      const cli2 = new DatabaseAgentCLI();

      expect(cli1).toBeInstanceOf(DatabaseAgentCLI);
      expect(cli2).toBeInstanceOf(DatabaseAgentCLI);
      expect(cli1).not.toBe(cli2);
    });

    it('should have start method available', () => {
      expect(cli.start).toBeDefined();
      expect(typeof cli.start).toBe('function');
    });
  });
});