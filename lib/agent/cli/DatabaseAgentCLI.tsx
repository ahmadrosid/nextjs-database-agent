import React, { useState, useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';

interface OutputMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

const DatabaseAgentApp: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<OutputMessage[]>([
    {
      id: '1',
      type: 'agent',
      content: 'Database Agent started! Type your query below.',
      timestamp: new Date(),
    },
  ]);

  const handleSubmit = useCallback((value: string) => {
    if (!value.trim()) return;

    // Add user message
    const userMessage: OutputMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate agent response (hardcoded for now)
    setTimeout(() => {
      const agentMessage: OutputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `I received your query: "${value}". This is a hardcoded response.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    }, 500);

    setInput('');
  }, []);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      {/* Output Area */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {messages.map((message) => (
          <Box key={message.id} marginBottom={1}>
            <Text color={message.type === 'user' ? 'cyan' : 'green'}>
              {message.type === 'user' ? '> ' : '🤖 '}
              {message.content}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Input Area */}
      <Box borderStyle="single" paddingX={1}>
        <Text color="yellow">Query: </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Enter your database query..."
        />
      </Box>
    </Box>
  );
};

export class DatabaseAgentCLI {
  start() {
    console.log(chalk.blue('Starting Database Agent CLI...'));
    render(<DatabaseAgentApp />);
  }
}