/**
 * Logging utility for Unity MCP Server
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

/**
 * Logger class with support for structured logging
 */
export class Logger {
  private component: string;
  private logLevel: LogLevel;

  constructor(component: string, logLevel: LogLevel = 'info') {
    this.component = component;
    this.logLevel = logLevel;
  }

  /**
   * Create a child logger with a sub-component name
   */
  child(subComponent: string): Logger {
    return new Logger(`${this.component}:${subComponent}`, this.logLevel);
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.log('info', message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, data);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      this.log('error', message, data);
    }
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      data,
    };

    // Format the log message
    const timestamp = entry.timestamp.toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const componentStr = entry.component.padEnd(20);

    let logMessage = `${timestamp} [${levelStr}] ${componentStr} ${message}`;

    // Add structured data if provided
    if (data) {
      if (data instanceof Error) {
        logMessage += `\\n${data.stack}`;
      } else if (typeof data === 'object') {
        logMessage += `\\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` ${data}`;
      }
    }

    // Output to appropriate stream
    if (level === 'error') {
      console.error(logMessage);
    } else if (level === 'warn') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}