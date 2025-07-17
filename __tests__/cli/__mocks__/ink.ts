// Mock for Ink components
export const render = jest.fn();
export const Box = jest.fn(({ children }) => children);
export const Text = jest.fn(({ children }) => children);
export const useInput = jest.fn();

// Mock for chalk
export const chalk = {
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
};

// Mock for ink-text-input
export const TextInput = jest.fn(({ value, onChange, onSubmit, placeholder }) => {
  return {
    value,
    onChange,
    onSubmit,
    placeholder,
  };
});

export default {
  render,
  Box,
  Text,
  useInput,
  TextInput,
  chalk,
};