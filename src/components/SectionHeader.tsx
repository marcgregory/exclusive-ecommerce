import type { ReactNode } from "react";
import { CarouselControls } from "./CarouselControls";

type SectionHeaderProps = {
  kicker: string;
  title: string;
  action?: ReactNode;
  controls?: boolean;
};

export function SectionHeader({ kicker, title, action, controls = false }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <div className="kicker"><span />{kicker}</div>
        <h2>{title}</h2>
      </div>
      <div className="section-header__actions">{action}{controls && <CarouselControls />}</div>
    </div>
  );
}
