import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

export function QuantityStepper({ value, onChange }: QuantityStepperProps) {
  return (
    <div className="quantity">
      <button onClick={() => onChange(Math.max(1, value - 1))}><Minus size={18} /></button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)}><Plus size={18} /></button>
    </div>
  );
}
