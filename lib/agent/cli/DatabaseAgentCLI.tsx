import React, { useState, useCallback, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { CoreAgent } from '../core/CoreAgent.js';
import { ProgressEvent } from '../core/types.js';

interface OutputMessage {
  id: string;
  type: 'user' | 'agent' | 'progress';
  content: string;
  timestamp: Date;
  progressType?: ProgressEvent['type'];
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
  const [coreAgent] = useState(() => new CoreAgent());

  // Listen to progress events from CoreAgent
  useEffect(() => {
    const handleProgress = (event: ProgressEvent) => {
      const progressMessage: OutputMessage = {
        id: `progress-${Date.now()}`,
        type: 'progress',
        content: event.message,
        timestamp: event.timestamp,
        progressType: event.type,
      };
      setMessages(prev => [...prev, progressMessage]);
    };

    coreAgent.on('progress', handleProgress);
    return () => coreAgent.off('progress', handleProgress);
  }, [coreAgent]);

  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    // Add user message
    const userMessage: OutputMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input immediately after submit

    // Process query with CoreAgent
    try {
      const response = await coreAgent.processQuery(value);
      const agentMessage: OutputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: OutputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [coreAgent]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" minHeight="100%">
      {/* Output Area - grows dynamically */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {messages.map((message) => (
          <Box key={message.id} marginBottom={1}>
            <Text color={
              message.type === 'user' ? 'cyan' :
              message.type === 'progress' ? 'yellow' : 'green'
            }>
              {message.type === 'user' ? '> ' :
               message.type === 'progress' ? '⚡ ' : '🤖 '}
              {message.content}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Input Area - always at bottom */}
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexShrink={0}>
        <Text color="yellow">Orchids: </Text>
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