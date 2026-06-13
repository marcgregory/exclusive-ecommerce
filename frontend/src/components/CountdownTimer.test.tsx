/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountdownTimer, CountdownTimerSkeleton } from './CountdownTimer';

const getTimerValues = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.countdown strong')).map((node) => node.textContent);

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('shows a matching skeleton before the stored target is ready', () => {
    const { container } = render(<CountdownTimerSkeleton />);

    expect(container.querySelector('.countdown--skeleton')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('Seconds')).toBeInTheDocument();
  });

  it('persists the target timestamp and does not reset after a remount', async () => {
    const storageKey = 'countdown-persisted-target';
    const firstRender = render(<CountdownTimer days={3} storageKey={storageKey} />);

    await act(async () => {});
    expect(getTimerValues(firstRender.container)).toEqual(['03', '00', '00', '00']);
    const storedTarget = window.localStorage.getItem(storageKey);

    firstRender.unmount();
    vi.setSystemTime(new Date('2026-01-03T00:00:00.000Z'));

    const secondRender = render(<CountdownTimer days={3} storageKey={storageKey} />);

    await act(async () => {});
    expect(getTimerValues(secondRender.container)).toEqual(['01', '00', '00', '00']);
    expect(window.localStorage.getItem(storageKey)).toBe(storedTarget);
  });

  it('recalculates remaining time from Date.now and uses leading zeros', async () => {
    window.localStorage.setItem(
      'countdown-leading-zeros',
      String(new Date('2026-01-01T00:01:05.000Z').getTime())
    );

    const { container } = render(<CountdownTimer storageKey="countdown-leading-zeros" />);

    await act(async () => {});
    expect(getTimerValues(container)).toEqual(['00', '00', '01', '05']);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getTimerValues(container)).toEqual(['00', '00', '01', '04']);
  });

  it('clamps at zero and displays an expiration state', async () => {
    window.localStorage.setItem(
      'countdown-expired',
      String(new Date('2025-12-31T23:59:59.000Z').getTime())
    );

    const { container } = render(<CountdownTimer storageKey="countdown-expired" />);

    await act(async () => {});
    expect(getTimerValues(container)).toEqual(['00', '00', '00', '00']);
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(container.querySelector('.countdown--expired')).toBeInTheDocument();
  });
});
