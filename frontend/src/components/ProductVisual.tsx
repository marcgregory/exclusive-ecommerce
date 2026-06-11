import { useState } from 'react';
import { isImageUrl, imageSrc } from '../lib/productUtils';

type ProductVisualProps = {
  type?: string;
  src?: string;
  large?: boolean;
  alt?: string;
};

export function ProductVisual({ type, src, large = false, alt = '' }: ProductVisualProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const activeSrc = src || (type && isImageUrl(type) ? type : undefined);

  if (activeSrc) {
    return (
      <div
        className={`product-visual product-visual--uploaded ${large ? 'product-visual--large' : ''}`}
      >
        {/* Skeleton loader */}
        {isLoading && !hasError && (
          <div className="product-visual__skeleton">
            <div className="product-visual__skeleton-wave"></div>
          </div>
        )}
        {/* Image with error handling */}
        <img
          src={imageSrc(activeSrc)}
          alt={alt}
          loading="lazy"
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={`product-visual__image ${hasError ? 'product-visual--image--error' : ''}`}
        />
        {/* Fallback content when image fails to load */}
        {hasError && (
          <div className="product-visual__fallback">
            <div className="product-visual__fallback-icon">🖼️</div>
            <div className="product-visual__fallback-text">Image unavailable</div>
          </div>
        )}
      </div>
    );
  }

  return <div className="product-visual__empty">No image</div>;
}
