import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logFilePath: string;
  private enableConsole: boolean;
  private enableFile: boolean;

  private constructor(
    logFilePath: string = 'logs/agent.log',
    enableConsole: boolean = true,
    enableFile?: boolean
  ) {
    this.logFilePath = logFilePath;
    this.enableConsole = enableConsole;
    
    // Auto-detect file logging based on NODE_ENV
    if (enableFile !== undefined) {
      this.enableFile = enableFile;
    } else {
      // Only enable file logging in development mode
      this.enableFile = process.env.NODE_ENV === 'development';
    }
  }

  static getInstance(
    logFilePath?: string,
    enableConsole?: boolean,
    enableFile?: boolean
  ): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logFilePath, enableConsole, enableFile);
    }
    return Logger.instance;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] ${entry.level} [${entry.component}] ${entry.message}${dataStr}`;
  }


  private async ensureLogDirectory(): Promise<void> {
    const logDir = dirname(this.logFilePath);
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.enableFile) return;

    try {
      await this.ensureLogDirectory();
      const logLine = this.formatLogEntry(entry) + '\n';
      await writeFile(this.logFilePath, logLine, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.enableConsole) return;

    const message = `${entry.component} - ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        break;
    }
  }

  private async log(level: LogLevel, component: string, message: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      component,
      message,
      data
    };

    // Log to console
    this.logToConsole(entry);

    // Log to file
    await this.writeToFile(entry);
  }

  async debug(component: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.DEBUG, component, message, data);
  }

  async info(component: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.INFO, component, message, data);
  }

  async warn(component: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.WARN, component, message, data);
  }

  async error(component: string, message: string, data?: any): Promise<void> {
    await this.log(LogLevel.ERROR, component, message, data);
  }


  // Method to clear log file
  async clearLogs(): Promise<void> {
    try {
      await writeFile(this.logFilePath, '');
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  // Method to configure logging
  configure(options: {
    logFilePath?: string;
    enableConsole?: boolean;
    enableFile?: boolean;
  }): void {
    if (options.logFilePath) this.logFilePath = options.logFilePath;
    if (options.enableConsole !== undefined) this.enableConsole = options.enableConsole;
    if (options.enableFile !== undefined) this.enableFile = options.enableFile;
  }

  // Method to get current logging configuration
  getConfig(): { logFilePath: string; enableConsole: boolean; enableFile: boolean; nodeEnv: string } {
    return {
      logFilePath: this.logFilePath,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      nodeEnv: process.env.NODE_ENV || 'not set'
    };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();