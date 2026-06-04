export function getErrorMessage(error: unknown, fallback = "Request failed") {
  return error instanceof Error && error.message ? error.message : fallback;
}
