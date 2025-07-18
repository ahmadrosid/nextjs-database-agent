#!/usr/bin/env node

import { program } from 'commander';
import { DatabaseAgentCLI } from '../lib/agent/cli/DatabaseAgentCLI';

program
  .name('database-agent')
  .description('Database agent for Spotify clone')
  .version('1.0.0');

program
  .command('start')
  .description('Start the interactive database agent')
  .argument('[prompt]', 'Initial prompt to process')
  .action((prompt?: string) => {
    const cli = new DatabaseAgentCLI();
    cli.start(prompt);
  });

program.parse();