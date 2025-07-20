import React from 'react';

// Mock for Ink components
export const render = jest.fn();
export const Box = jest.fn(({ children, flexDirection, flexGrow, borderStyle, paddingX, paddingY, marginBottom, ...props }) => {
  // Filter out Ink-specific props that don't exist on DOM elements
  const domProps = Object.keys(props).reduce((acc, key) => {
    // Only include standard DOM attributes
    if (!key.startsWith('flex') && !key.startsWith('padding') && !key.startsWith('margin') && key !== 'borderStyle') {
      acc[key] = props[key];
    }
    return acc;
  }, {} as any);
  
  return React.createElement('div', domProps, children);
});
export const Text = jest.fn(({ children, color, ...props }) => {
  return React.createElement('span', { ...props, 'data-color': color }, children);
});
export const useInput = jest.fn();

// Mock for chalk
export const chalk = {
  blue: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
};


const inkMock = {
  render,
  Box,
  Text,
  useInput,
  chalk,
};

export default inkMock;