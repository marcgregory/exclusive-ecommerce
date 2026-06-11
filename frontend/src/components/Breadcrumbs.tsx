import React from 'react';
import { ChevronRight } from 'lucide-react';

type BreadcrumbsProps = {
  items: string[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="breadcrumbs">
      {items.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 && <ChevronRight size={14} />}
          <span className={index === items.length - 1 ? 'active' : ''}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
