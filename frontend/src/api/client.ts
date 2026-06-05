const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:4000";

export type ApiOptions = RequestInit & {
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.requestId || response.headers.get("x-request-id") || undefined,
    );
  }
  return data;
}
