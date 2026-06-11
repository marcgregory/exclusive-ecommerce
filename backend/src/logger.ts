type LogLevel = 'info' | 'error';

type LogFields = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  console.log(serialized);
}

export function logInfo(event: string, fields?: LogFields) {
  writeLog('info', event, fields);
}

export function logError(event: string, fields?: LogFields) {
  writeLog('error', event, fields);
}

export function getErrorLogFields(error: unknown): LogFields {
  if (!(error instanceof Error)) {
    return { errorMessage: String(error) };
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  };
}
