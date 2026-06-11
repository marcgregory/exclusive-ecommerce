import React from 'react';

export function ProductCardSkeleton() {
  return (
    <article
      className="product-card-skeleton"
      data-testid="product-card-skeleton"
      aria-hidden="true"
    >
      <div className="skeleton skeleton-product-image" />
      <div className="skeleton skeleton-product-title" />
      <div className="skeleton skeleton-product-price" />
      <div className="skeleton skeleton-product-button" />
    </article>
  );
}
