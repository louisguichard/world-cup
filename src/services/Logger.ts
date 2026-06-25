export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  module: string;
  context?: Record<string, unknown>;
  timestamp: number;
};

const MAX_BUFFER = 500;
let logId = 0;

class LoggerService {
  private buffer: LogEntry[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      window.__appLogs = this.buffer;
    }
  }

  private push(level: LogLevel, message: string, module: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: String(++logId),
      level,
      message,
      module,
      context,
      timestamp: Date.now()
    };

    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.shift();
    }

    if (typeof window !== "undefined") {
      window.__appLogs = this.buffer;
      if (level === "error") {
        window.__lastError = entry;
      }
    }

    const prefix = `[${module}]`;
    if (level === "error") {
      console.error(prefix, message, context ?? "");
    } else if (level === "warn") {
      console.warn(prefix, message, context ?? "");
    } else if (import.meta.env.DEV) {
      console.log(prefix, message, context ?? "");
    }

    return entry;
  }

  debug(message: string, module: string, context?: Record<string, unknown>): LogEntry {
    return this.push("debug", message, module, context);
  }

  info(message: string, module: string, context?: Record<string, unknown>): LogEntry {
    return this.push("info", message, module, context);
  }

  warn(message: string, module: string, context?: Record<string, unknown>): LogEntry {
    return this.push("warn", message, module, context);
  }

  error(message: string, module: string, context?: Record<string, unknown>): LogEntry {
    return this.push("error", message, module, context);
  }

  getBuffer(): readonly LogEntry[] {
    return this.buffer;
  }
}

export const logger = new LoggerService();
