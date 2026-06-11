/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('renders the current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('calls onChange with value - 1 when minus is clicked and clamps at 1', () => {
    const onChange = vi.fn();
    const { container } = render(<QuantityStepper value={1} onChange={onChange} />);
    const buttons = container.querySelectorAll('.quantity button');

    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with value + 1 when plus is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<QuantityStepper value={2} onChange={onChange} />);
    const buttons = container.querySelectorAll('.quantity button');

    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
