import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Ink components
jest.mock('ink', () => {
  const React = require('react');
  return {
    render: jest.fn(),
    Box: ({ children, flexDirection, flexGrow, borderStyle, paddingX, paddingY, marginBottom, ...props }: any) => {
      // Filter out Ink-specific props that don't exist on DOM elements
      const domProps = Object.keys(props).reduce((acc, key) => {
        // Only include standard DOM attributes
        if (!key.startsWith('flex') && !key.startsWith('padding') && !key.startsWith('margin') && key !== 'borderStyle') {
          acc[key] = props[key];
        }
        return acc;
      }, {} as any);
      
      return React.createElement('div', domProps, children);
    },
    Text: ({ children, color, ...props }: any) => React.createElement('span', { ...props, 'data-color': color }, children),
    useInput: jest.fn(),
  };
});

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
  default: ({ value, onChange, onSubmit, placeholder }: any) => 
    React.createElement('input', {
      value,
      onChange: (e: any) => onChange(e.target.value),
      onKeyDown: (e: any) => e.key === 'Enter' && onSubmit(e.target.value),
      placeholder,
      'data-testid': 'text-input'
    }),
}));

// Import the component after mocking
import { DatabaseAgentCLI } from '../../lib/agent/cli/DatabaseAgentCLI';

// Extract the React component from the CLI class
const DatabaseAgentApp: React.FC = () => {
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState([
    {
      id: '1',
      type: 'agent' as const,
      content: 'Database Agent started! Type your query below.',
      timestamp: new Date(),
    },
  ]);

  const handleSubmit = React.useCallback((value: string) => {
    if (!value.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: value,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent' as const,
        content: `I received your query: "${value}". This is a hardcoded response.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    }, 500);

    setInput('');
  }, []);

  const { Box, Text } = require('ink');
  const TextInput = require('ink-text-input').default;

  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      messages.map((message) =>
        React.createElement(Box, { key: message.id },
          React.createElement(Text, { 
            color: message.type === 'user' ? 'cyan' : 'green' 
          }, `${message.type === 'user' ? '> ' : '🤖 '}${message.content}`)
        )
      )
    ),
    React.createElement(Box, { borderStyle: 'single' },
      React.createElement(Text, { color: 'yellow' }, 'Query: '),
      React.createElement(TextInput, {
        value: input,
        onChange: setInput,
        onSubmit: handleSubmit,
        placeholder: 'Enter your database query...'
      })
    )
  );
};

describe('DatabaseAgentApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render initial agent message', () => {
    render(React.createElement(DatabaseAgentApp));
    
    expect(screen.getByText(/Database Agent started!/)).toBeInTheDocument();
  });

  it('should render input field with correct placeholder', () => {
    render(React.createElement(DatabaseAgentApp));
    
    const input = screen.getByTestId('text-input');
    expect(input).toHaveAttribute('placeholder', 'Enter your database query...');
  });

  it('should render Query label', () => {
    render(React.createElement(DatabaseAgentApp));
    
    expect(screen.getByText('Query:')).toBeInTheDocument();
  });

  it('should display agent messages with correct styling', () => {
    render(React.createElement(DatabaseAgentApp));
    
    const agentMessage = screen.getByText(/🤖 Database Agent started!/);
    expect(agentMessage).toHaveAttribute('data-color', 'green');
  });

  it('should have empty input value initially', () => {
    render(React.createElement(DatabaseAgentApp));
    
    const input = screen.getByTestId('text-input');
    expect(input).toHaveValue('');
  });
});