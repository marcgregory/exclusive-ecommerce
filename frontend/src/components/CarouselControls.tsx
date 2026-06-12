import { ArrowLeft, ArrowRight } from 'lucide-react';

type CarouselControlsProps = {
  onLeftClick: () => void;
  onRightClick: () => void;
  canScrollLeft?: boolean;
  canScrollRight?: boolean;
};

export function CarouselControls({
  onLeftClick,
  onRightClick,
  canScrollLeft = true,
  canScrollRight = true,
}: CarouselControlsProps) {
  return (
    <div className="carousel-controls">
      <button onClick={onLeftClick} aria-label="Previous" disabled={!canScrollLeft}>
        <ArrowLeft size={22} />
      </button>
      <button onClick={onRightClick} aria-label="Next" disabled={!canScrollRight}>
        <ArrowRight size={22} />
      </button>
    </div>
  );
}
