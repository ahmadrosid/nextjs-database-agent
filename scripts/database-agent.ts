#!/usr/bin/env node

import { program } from 'commander';
import { AgentCLI } from '../agent/cli/AgentCLI';

program
  .name('database-agent')
  .description('Database agent for Spotify clone')
  .version('1.0.0');

program
  .command('start')
  .description('Start the interactive database agent')
  .argument('[prompt]', 'Initial prompt to process')
  .action((prompt?: string) => {
    const cli = new AgentCLI();
    cli.start(prompt);
  });

program.parse();