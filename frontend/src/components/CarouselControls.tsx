import { ArrowLeft, ArrowRight } from "lucide-react";

type CarouselControlsProps = {
  onLeftClick: () => void;
  onRightClick: () => void;
};

export function CarouselControls({ onLeftClick, onRightClick }: CarouselControlsProps) {
  return (
    <div className="carousel-controls">
      <button onClick={onLeftClick} aria-label="Previous"><ArrowLeft size={22} /></button>
      <button onClick={onRightClick} aria-label="Next"><ArrowRight size={22} /></button>
    </div>
  );
}
