import { useEffect, useState } from 'react';

type CountdownTimerProps = {
  days?: number;
  storageKey?: string;
};

const getRemaining = (target: number) => {
  const total = Math.max(0, target - Date.now());
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total / 3_600_000) % 24);
  const minutes = Math.floor((total / 60_000) % 60);
  const seconds = Math.floor((total / 1_000) % 60);

  return { days, hours, minutes, seconds, total };
};

const pad = (value: number) => String(value).padStart(2, '0');
const DEFAULT_STORAGE_KEY = 'exclusive-countdown-target';
function readStoredTarget(storageKey: string, days: number) {
  const fallbackTarget = Date.now() + days * 86_400_000;

  try {
    const storedTarget = window.localStorage.getItem(storageKey);
    const parsedTarget = storedTarget ? Number(storedTarget) : NaN;

    if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
      return parsedTarget;
    }

    window.localStorage.setItem(storageKey, String(fallbackTarget));
  } catch {
    return fallbackTarget;
  }

  return fallbackTarget;
}

const countdownItems = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
] as const;

export function CountdownTimerSkeleton() {
  return (
    <div className="countdown countdown--skeleton" aria-hidden="true">
      {countdownItems.map(([unit, label]) => (
        <div key={unit}>
          <strong className="skeleton" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function CountdownTimer({
  days = 3,
  storageKey = DEFAULT_STORAGE_KEY,
}: CountdownTimerProps) {
  const [target, setTarget] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const nextTarget = readStoredTarget(storageKey, days);
    setTarget(nextTarget);
    setRemaining(getRemaining(nextTarget));
  }, [days, storageKey]);

  useEffect(() => {
    if (target === null) return undefined;

    const tick = () => {
      const nextRemaining = getRemaining(target);
      setRemaining(nextRemaining);
      return nextRemaining.total;
    };

    tick();

    if (getRemaining(target).total <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const total = tick();
      if (total <= 0) {
        window.clearInterval(interval);
      }
    }, 1000);
    const syncAfterPause = () => tick();

    window.addEventListener('focus', syncAfterPause);
    document.addEventListener('visibilitychange', syncAfterPause);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncAfterPause);
      document.removeEventListener('visibilitychange', syncAfterPause);
    };
  }, [target]);

  if (!remaining) {
    return <CountdownTimerSkeleton />;
  }

  const isExpired = remaining.total <= 0;

  return (
    <div
      className={`countdown${isExpired ? ' countdown--expired' : ''}`}
      aria-label={isExpired ? 'Countdown expired' : 'Countdown timer'}
    >
      {countdownItems.map(([unit, label]) => (
        <div key={label}>
          <strong>{pad(remaining[unit])}</strong>
          <span>{label}</span>
        </div>
      ))}
      {isExpired && (
        <span className="countdown__expired" role="status">
          Expired
        </span>
      )}
    </div>
  );
}
