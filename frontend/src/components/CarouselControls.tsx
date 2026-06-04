import { ArrowLeft, ArrowRight } from "lucide-react";

export function CarouselControls() {
  return (
    <div className="carousel-controls">
      <button aria-label="Previous"><ArrowLeft size={22} /></button>
      <button aria-label="Next"><ArrowRight size={22} /></button>
    </div>
  );
}
