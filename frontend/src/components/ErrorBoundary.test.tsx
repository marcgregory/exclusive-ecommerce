/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("../lib/monitoring", () => ({ reportClientError: vi.fn() }));
import { reportClientError } from "../lib/monitoring";

const mockedReportClientError = vi.mocked(reportClientError);

function BrokenChild() {
  throw new Error("Render failed");
  return null;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    mockedReportClientError.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a recovery state and reports render errors", () => {
    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/unexpected issue/i)).toBeDefined();
    expect(mockedReportClientError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: "react.error_boundary" }),
    );
  });
});
