/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactPage } from './ContactPage';

const apiMocks = vi.hoisted(() => ({
  sendContactMessage: vi.fn(),
}));

vi.mock('../api/ecommerceApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/ecommerceApi')>();
  return {
    ...actual,
    useSendContactMessageMutation: () => apiMocks.sendContactMessage(),
  };
});

function fillValidForm() {
  return userEvent
    .type(screen.getByLabelText(/Your Name/i), 'Jane Doe')
    .then(() => userEvent.type(screen.getByLabelText(/Your Email/i), 'jane@example.com'))
    .then(() => userEvent.type(screen.getByLabelText(/Your Phone/i), '555-0123'))
    .then(() =>
      userEvent.type(screen.getByLabelText(/Your Message/i), 'I need help with an order.')
    );
}

describe('ContactPage', () => {
  beforeEach(() => {
    apiMocks.sendContactMessage.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits the contact form and resets it', async () => {
    const unwrapFn = vi.fn().mockResolvedValue({ message: { id: 'msg-1' } });
    const mockSend = vi.fn().mockReturnValue({ unwrap: unwrapFn });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/Your Phone/i), '555-0123');
    await userEvent.type(screen.getByLabelText(/Your Message/i), 'I need help with an order.');

    await userEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-0123',
        message: 'I need help with an order.',
      })
    );

    expect(await screen.findByText(/Message sent/i)).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>(/Your Name/i).value).toBe('');
    expect(screen.getByLabelText<HTMLInputElement>(/Your Email/i).value).toBe('');
    expect(screen.getByLabelText<HTMLInputElement>(/Your Phone/i).value).toBe('');
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Your Message/i).value).toBe('');
  });

  it('does not show validation errors on initial page load', () => {
    const mockSend = vi.fn().mockReturnValue({ unwrap: vi.fn() });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    expect(screen.queryByText(/Name is required/i)).toBeNull();
    expect(screen.queryByText(/Enter a valid email address/i)).toBeNull();
    expect(screen.queryByText(/Phone is required/i)).toBeNull();
    expect(screen.queryByText(/Message is required/i)).toBeNull();
  });

  it('shows validation errors when required fields are empty', async () => {
    const unwrapFn = vi.fn();
    const mockSend = vi.fn().mockReturnValue({ unwrap: unwrapFn });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    await userEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    expect(await screen.findByText(/Name is required/i)).toBeDefined();
    expect(screen.getByText(/Enter a valid email address/i)).toBeDefined();
    expect(screen.getByText(/Phone is required/i)).toBeDefined();
    expect(screen.getByText(/Message is required/i)).toBeDefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects an invalid email and does not submit', async () => {
    const unwrapFn = vi.fn();
    const mockSend = vi.fn().mockReturnValue({ unwrap: unwrapFn });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/Your Phone/i), '555-0123');
    await userEvent.type(screen.getByLabelText(/Your Message/i), 'Hello there.');

    await userEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    expect(await screen.findByText(/Enter a valid email address/i)).toBeDefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('disables the submit button and shows Sending label while in flight', async () => {
    let resolveSend!: (value: { message: { id: string } }) => void;
    const unwrapFn = vi.fn(
      () =>
        new Promise<{ message: { id: string } }>((resolve) => {
          resolveSend = resolve;
        })
    );
    const mockSend = vi.fn().mockReturnValue({ unwrap: unwrapFn });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    const sendingButton = await screen.findByRole('button', { name: /Sending\.\.\./i });
    expect(sendingButton).toBeDefined();
    expect((sendingButton as HTMLButtonElement).disabled).toBe(true);

    resolveSend({ message: { id: 'msg-1' } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Send Message/i })).toBeDefined()
    );
  });

  it('surfaces a server error and keeps form values intact', async () => {
    const unwrapFn = vi.fn().mockRejectedValue({
      status: 500,
      data: { message: 'Server unavailable, try again later.' },
    });
    const mockSend = vi.fn().mockReturnValue({ unwrap: unwrapFn });
    apiMocks.sendContactMessage.mockReturnValue([mockSend, { isLoading: false }]);

    render(<ContactPage />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    const errorNode = await screen.findByText(/Server unavailable, try again later\./i);
    expect(errorNode).toBeDefined();
    expect(errorNode.className).toContain('form-status--error');

    // Form should not be reset on failure so the user can correct and retry.
    expect(screen.getByLabelText<HTMLInputElement>(/Your Name/i).value).toBe('Jane Doe');
    expect(screen.getByLabelText<HTMLInputElement>(/Your Email/i).value).toBe('jane@example.com');
    expect(screen.getByLabelText<HTMLInputElement>(/Your Phone/i).value).toBe('555-0123');
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Your Message/i).value).toBe(
      'I need help with an order.'
    );
  });
});
