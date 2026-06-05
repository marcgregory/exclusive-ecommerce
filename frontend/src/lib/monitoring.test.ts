/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/client", () => ({ api: vi.fn() }));
import { api } from "../api/client";
import { buildClientErrorPayload, reportClientError } from "./monitoring";

const mockedApi = vi.mocked(api);

describe("client monitoring", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedApi.mockResolvedValue({});
    vi.stubEnv("VITE_ENABLE_CLIENT_ERROR_REPORTING", "true");
    window.history.pushState({}, "", "/checkout");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds a small client error payload", () => {
    const error = new Error("Checkout failed");

    const payload = buildClientErrorPayload(error, {
      componentStack: "Component stack",
      source: "react.error_boundary",
    });

    expect(payload).toMatchObject({
      message: "Checkout failed",
      name: "Error",
      componentStack: "Component stack",
      path: "/checkout",
      source: "react.error_boundary",
    });
    expect(payload.userAgent).toBeTruthy();
  });

  it("posts client errors when reporting is enabled", () => {
    reportClientError(new Error("Boom"), { source: "window.error" });

    expect(mockedApi).toHaveBeenCalledWith(
      "/api/client-errors",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"message":"Boom"'),
      }),
    );
  });

  it("falls back to console logging when reporting is disabled", () => {
    vi.stubEnv("VITE_ENABLE_CLIENT_ERROR_REPORTING", "false");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    reportClientError(new Error("Local boom"), { source: "window.error" });

    expect(mockedApi).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Client error",
      expect.objectContaining({ message: "Local boom" }),
    );
  });
});
