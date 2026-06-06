export function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
