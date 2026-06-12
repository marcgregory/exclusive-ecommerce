import { useEffect, useMemo, useState } from 'react';

type CountdownTimerProps = {
  days?: number;
};

const getRemaining = (target: number) => {
  const total = Math.max(0, target - Date.now());
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total / 3_600_000) % 24);
  const minutes = Math.floor((total / 60_000) % 60);
  const seconds = Math.floor((total / 1_000) % 60);

  return { days, hours, minutes, seconds };
};

const pad = (value: number) => String(value).padStart(2, '0');

export function CountdownTimer({ days = 3 }: CountdownTimerProps) {
  const target = useMemo(() => Date.now() + days * 86_400_000, [days]);
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const interval = window.setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  return (
    <div className="countdown">
      {[
        [pad(remaining.days), 'Days'],
        [pad(remaining.hours), 'Hours'],
        [pad(remaining.minutes), 'Minutes'],
        [pad(remaining.seconds), 'Seconds'],
      ].map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
