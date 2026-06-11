import { Minus, Plus } from 'lucide-react';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
};

export function QuantityStepper({
  value,
  onChange,
  max,
  disabled = false,
  decrementLabel = 'Decrease quantity',
  incrementLabel = 'Increase quantity',
}: QuantityStepperProps) {
  const hasReachedMax = typeof max === 'number' && value >= max;

  return (
    <div className="quantity">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled}
        aria-label={decrementLabel}
      >
        <Minus size={18} />
      </button>
      <span>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled || hasReachedMax}
        aria-label={hasReachedMax ? `${incrementLabel} unavailable` : incrementLabel}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
