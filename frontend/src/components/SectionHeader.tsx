import type { ReactNode } from 'react';
import { CarouselControls } from './CarouselControls';

type SectionHeaderProps = {
  kicker: string;
  title: string;
  action?: ReactNode;
  controls?: boolean;
  onLeftScroll?: () => void;
  onRightScroll?: () => void;
};

export function SectionHeader({
  kicker,
  title,
  action,
  controls = false,
  onLeftScroll,
  onRightScroll,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <div className="kicker">
          <span />
          {kicker}
        </div>
        <h2>{title}</h2>
      </div>
      <div className="section-header__actions">
        {action}
        {controls && <CarouselControls onLeftClick={onLeftScroll} onRightClick={onRightScroll} />}
      </div>
    </div>
  );
}
