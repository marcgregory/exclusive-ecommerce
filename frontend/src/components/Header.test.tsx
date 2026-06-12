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
        authStatus="unauthenticated"
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
        authStatus="authenticated"
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
    await userEvent.click(screen.getByRole('menuitem', { name: /My Order/i }));
    expect(navigate).toHaveBeenCalledWith('/account#orders');

    await userEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /My Cancellations/i }));
    expect(navigate).toHaveBeenCalledWith('/account#cancellations');

    await userEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /My Reviews/i }));
    expect(navigate).toHaveBeenCalledWith('/account#reviews');

    await userEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Logout/i }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });

  it('closes the account dropdown on Escape and outside click', async () => {
    const interaction = userEvent.setup();

    render(
      <Header
        navigate={vi.fn()}
        user={user}
        authStatus="authenticated"
        cartCount={0}
        wishlistCount={0}
        onLogout={vi.fn().mockResolvedValue(undefined)}
        logoutSaving={false}
      />
    );

    await interaction.click(screen.getByRole('button', { name: /Account menu/i }));
    expect(screen.getByRole('menu')).toBeDefined();

    await interaction.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    await interaction.click(screen.getByRole('button', { name: /Account menu/i }));
    expect(screen.getByRole('menu')).toBeDefined();

    await interaction.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
