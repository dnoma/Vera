export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
};

export function createConsoleJsonLogger(): Logger {
  return {
    log(level, message, fields) {
      const payload = {
        level,
        message,
        ...(fields ?? {}),
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify(payload));
    },
  };
}

