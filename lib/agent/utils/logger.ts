import pino from 'pino';
import dotenv from 'dotenv';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const logFilePath = resolve('logs/agent.log');

// Create file logger for development and test
let fileLogger: pino.Logger | null = null;

if (isDevelopment || isTest) {
  // Ensure log directory exists
  const logDir = dirname(logFilePath);
  if (!existsSync(logDir)) {
    mkdir(logDir, { recursive: true }).catch(console.error);
  }
  
  // Create file logger with pino-pretty format using file path
  fileLogger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        destination: logFilePath,
        colorize: false,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{component} - {msg}',
        mkdir: true,
        singleLine: true
      }
    }
  });
}

export const logger = {
  debug: (component: string, message: string, data?: any) => {
    if (fileLogger) {
      fileLogger.debug({ component, ...data }, message);
    }
  },
  info: (component: string, message: string, data?: any) => {
    if (fileLogger) {
      fileLogger.info({ component, ...data }, message);
    }
  },
  warn: (component: string, message: string, data?: any) => {
    if (fileLogger) {
      fileLogger.warn({ component, ...data }, message);
    }
  },
  error: (component: string, message: string, data?: any) => {
    if (fileLogger) {
      fileLogger.error({ component, ...data }, message);
    }
  }
};