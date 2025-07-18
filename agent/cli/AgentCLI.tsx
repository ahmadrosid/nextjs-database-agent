import 'dotenv/config'

import React, { useState, useCallback, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { CoreAgent } from '../core/CoreAgent.js';
import { ProgressEvent } from '../types/index.js';

// Configure marked-terminal for better terminal rendering
marked.setOptions({
  renderer: markedTerminal({
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.green.bold,
    hr: chalk.reset,
    listitem: chalk.reset,
    list: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.dim.gray.strikethrough,
    link: chalk.blue,
    href: chalk.blue.underline,
  }) as any,
});

const formatMarkdown = (content: string): string => {
  try {
    const result = marked(content);
    return typeof result === 'string' ? result : content;
  } catch (error) {
    return content;
  }
};

interface OutputMessage {
  id: string;
  type: 'user' | 'agent' | 'progress';
  content: string;
  timestamp: Date;
  progressType?: ProgressEvent['type'];
}

interface DatabaseAgentAppProps {
  initialPrompt?: string;
}

const DatabaseAgentApp: React.FC<DatabaseAgentAppProps> = ({ initialPrompt }) => {
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
  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number; totalTokens: number } | null>(null);
  const [instructionQueue, setInstructionQueue] = useState<string[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);


  // Process initial prompt if provided
  useEffect(() => {
    if (initialPrompt) {
      handleSubmit(initialPrompt);
    }
  }, [initialPrompt]);

  // Listen to progress events from CoreAgent
  useEffect(() => {
    const handleProgress = (event: ProgressEvent) => {      
      // Update current status for display with short messages
      if (event.type === 'complete' || event.type === 'error' || event.type === 'aborted') {
        setCurrentStatus('');
        setTokenUsage(null);
      } else if (event.type === 'token_update') {
        // Update token usage without changing status
        if (event.tokenUsage) {
          setTokenUsage(event.tokenUsage);
        }
      } else if (event.type === 'thinking_complete') {
        // Add thinking output to message history
        if (event.message.trim()) {
          const thinkingMessage: OutputMessage = {
            id: Date.now().toString(),
            type: 'agent',
            content: `**Thinking:** ${event.message}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, thinkingMessage]);
        }
      } else if (event.type === 'plan') {
        // Add plan output to message history with special formatting
        if (event.message.trim()) {
          const planMessage: OutputMessage = {
            id: Date.now().toString(),
            type: 'agent',
            content: `**📋 Implementation Plan:**\n\n${event.message}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, planMessage]);
        }
      } else {
        let newStatus: string;
        
        if (event.type === 'executing_tools') {
          // Use the actual message for tool execution to show detailed info
          newStatus = event.message;
        } else {
          // Use status map for other events
          const statusMap = {
            thinking: 'Thinking',
            analyzing: 'Analyzing',
            generating: 'Generating'
          };
          newStatus = statusMap[event.type] || event.type;
        }
        setCurrentStatus(newStatus);
      }

      // Don't add progress messages to history - only show in status area
    };

    coreAgent.on('progress', handleProgress);
    return () => {
      coreAgent.off('progress', handleProgress);
    };
  }, [coreAgent]);

  // Process queue when agent finishes
  const processQueue = useCallback(async () => {
    if (isProcessingQueue || instructionQueue.length === 0 || coreAgent.isCurrentlyProcessing()) {
      return;
    }

    setIsProcessingQueue(true);
    
    while (instructionQueue.length > 0) {
      const nextInstruction = instructionQueue[0];
      setInstructionQueue(prev => prev.slice(1));
      
      // Add queued message indicator
      const queuedMessage: OutputMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `${nextInstruction} 📝 *[from queue]*`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, queuedMessage]);

      // Process queued instruction
      try {
        const response = await coreAgent.processQuery(nextInstruction);
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
          content: error instanceof Error && error.message === 'Operation was cancelled' 
            ? 'Operation was cancelled by user.' 
            : 'Sorry, I encountered an error processing your queued request.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }

    setIsProcessingQueue(false);
  }, [coreAgent, instructionQueue, isProcessingQueue]);

  // Watch for agent completion to process queue
  useEffect(() => {
    if (!coreAgent.isCurrentlyProcessing() && !isProcessingQueue) {
      processQueue();
    }
  }, [currentStatus, processQueue, isProcessingQueue]);

  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;

    // If agent is busy, add to queue
    if (coreAgent.isCurrentlyProcessing()) {
      setInstructionQueue(prev => [...prev, value]);
      
      // Add queued user message with indicator
      const queuedUserMessage: OutputMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `${value} ⏳ *[queued - ${instructionQueue.length + 1} in queue]*`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, queuedUserMessage]);
      setInput('');
      return;
    }

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
        content: error instanceof Error && error.message === 'Operation was cancelled' 
          ? 'Operation was cancelled by user.' 
          : 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [coreAgent, instructionQueue]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
    if (key.escape) {
      // Abort current operation if processing
      if (coreAgent.isCurrentlyProcessing()) {
        coreAgent.abort();
        setCurrentStatus('');
        setTokenUsage(null);
      }
    }
  });

  return (
    <Box flexDirection="column" minHeight="100%">
      {/* Output Area - grows dynamically */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {messages.map((message) => (
          <Box key={message.id} marginBottom={1}>
            {message.type === 'agent' ? (
              <Text>
                <Text color="green">🤖 </Text>
                {formatMarkdown(message.content)}
              </Text>
            ) : (
              <Text color={
                message.type === 'user' ? 'cyan' :
                message.type === 'progress' ? 'yellow' : 'green'
              }>
                {message.type === 'user' ? '> ' :
                 message.type === 'progress' ? '⚡ ' : '🤖 '}
                {message.content}
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Status Area - between output and input */}
      {(currentStatus || instructionQueue.length > 0) && (
        <Box>
          {currentStatus && (
            <Text color="yellow">
              ⚡ {currentStatus}
              {tokenUsage && (
                <Text color="gray"> [{tokenUsage.inputTokens + tokenUsage.outputTokens} tokens]</Text>
              )}
            </Text>
          )}
          {instructionQueue.length > 0 && (
            <Text color="magenta">
              📝 {instructionQueue.length} instruction{instructionQueue.length > 1 ? 's' : ''} queued
            </Text>
          )}
        </Box>
      )}

      {/* Input Area - always at bottom */}
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexShrink={0}>
        <Text color="gray">Orchids: </Text>
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

export class AgentCLI {
  start(initialPrompt?: string) {
    console.log(chalk.gray('Starting Database Agent CLI...'));
    render(<DatabaseAgentApp initialPrompt={initialPrompt} />);
  }
}