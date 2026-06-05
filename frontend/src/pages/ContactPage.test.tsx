/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactPage } from "./ContactPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: vi.fn() };
});
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

describe("ContactPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("submits the contact form and resets it", async () => {
    mockedApi.mockResolvedValue({ message: { id: "msg-1" } });
    render(<ContactPage />);

    await userEvent.type(screen.getByLabelText(/Your Name/i), "Jane Doe");
    await userEvent.type(screen.getByLabelText(/Your Email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/Your Phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/Your Message/i), "I need help with an order.");

    await userEvent.click(screen.getByRole("button", { name: /Send Message/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/contact",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const [, options] = mockedApi.mock.calls[0];
    expect(JSON.parse(options?.body as string)).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-0123",
      message: "I need help with an order.",
    });
    expect(await screen.findByText(/Message sent/i)).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>(/Your Name/i).value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>(/Your Email/i).value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>(/Your Phone/i).value).toBe("");
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Your Message/i).value).toBe("");
  });
});
