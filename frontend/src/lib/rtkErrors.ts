import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export function getRtkStatus(error: unknown) {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
}

export function getRtkErrorMessage(error: unknown) {
  const data = (error as FetchBaseQueryError | undefined)?.data;
  if (typeof data === 'object' && data && 'message' in data) {
    return String((data as { message?: unknown }).message || 'Request failed');
  }
  if (typeof data === 'string') return data;
  return error ? 'Request failed' : '';
}
