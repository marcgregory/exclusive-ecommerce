import { api } from '../api/client';

type ClientErrorContext = {
  componentStack?: string;
  source?: string;
};

type ClientErrorPayload = {
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  path: string;
  source: string;
  userAgent: string;
};

function isReportingEnabled() {
  return import.meta.env.VITE_ENABLE_CLIENT_ERROR_REPORTING === 'true';
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || 'Client error',
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Client error',
    name: 'Error',
  };
}

export function buildClientErrorPayload(
  error: unknown,
  context: ClientErrorContext = {}
): ClientErrorPayload {
  const normalized = normalizeError(error);

  return {
    ...normalized,
    componentStack: context.componentStack,
    path: window.location.pathname,
    source: context.source || 'unknown',
    userAgent: navigator.userAgent,
  };
}

export function reportClientError(error: unknown, context: ClientErrorContext = {}) {
  const payload = buildClientErrorPayload(error, context);

  if (!isReportingEnabled()) {
    console.error('Client error', payload);
    return;
  }

  void api('/api/client-errors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).catch((reportingError) => {
    console.error('Client error reporting failed', reportingError);
  });
}
