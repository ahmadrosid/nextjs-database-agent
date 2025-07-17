import React, { useState, useCallback, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { CoreAgent } from '../core/CoreAgent.js';
import { ProgressEvent } from '../types/index.js';

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
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [animationFrame, setAnimationFrame] = useState<number>(0);

  // Animation for status display
  useEffect(() => {
    if (!currentStatus) return;

    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [currentStatus]);

  // Listen to progress events from CoreAgent
  useEffect(() => {
    const handleProgress = (event: ProgressEvent) => {
      // Update current status for display with short messages
      if (event.type === 'complete' || event.type === 'error') {
        setCurrentStatus('');
        setAnimationFrame(0);
      } else {
        const statusMap = {
          thinking: 'Thinking',
          analyzing: 'Analyzing',
          executing_tools: 'Executing tools',
          generating: 'Generating'
        };
        setCurrentStatus(statusMap[event.type] || event.type);
      }

      // Don't add progress messages to history - only show in status area
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

      {/* Status Area - between output and input */}
      {currentStatus && (
        <Text color="yellow">
          ⚡ {currentStatus}{'.'.repeat(animationFrame)}
        </Text>
      )}

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