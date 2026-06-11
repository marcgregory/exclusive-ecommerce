/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';
import type { PublicUser } from '../types';

const user: PublicUser = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  address: '123 Maple Drive',
  role: 'customer',
};

describe('Header', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the signup nav link', async () => {
    const navigate = vi.fn();

    render(
      <Header
        navigate={navigate}
        user={null}
        cartCount={0}
        wishlistCount={0}
        onLogout={vi.fn().mockResolvedValue(undefined)}
        logoutSaving={false}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(navigate).toHaveBeenCalledWith('/signup');
  });

  it('hides the signup nav link when signed in and opens the account dropdown', async () => {
    const navigate = vi.fn();
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(
      <Header
        navigate={navigate}
        user={user}
        cartCount={2}
        wishlistCount={1}
        onLogout={onLogout}
        logoutSaving={false}
      />
    );

    expect(screen.queryByRole('button', { name: /Sign Up/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Account menu/i }));

    expect(screen.getByRole('menuitem', { name: /Manage My Account/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /My Order/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /My Cancellations/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /My Reviews/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Logout/i })).toBeDefined();

    await userEvent.click(screen.getByRole('menuitem', { name: /Manage My Account/i }));
    expect(navigate).toHaveBeenCalledWith('/account');

    await userEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Logout/i }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });
});
