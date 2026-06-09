import { API_BASE } from "../api/client";
import { useState } from "react";

type ProductVisualProps = {
  type?: string;
  large?: boolean;
  alt?: string;
};

function isImageUrl(value: string) {
  return value.startsWith("/uploads/") || /^https?:\/\//i.test(value);
}

function imageSrc(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value}`;
}

function visualClassName(type = "default", large = false) {
  const safeType = type.replace(/[^a-z0-9_-]/gi, "-") || "default";
  return `product-visual product-visual--${safeType} ${large ? "product-visual--large" : ""}`;
}

export function ProductVisual({ type, large = false, alt = "" }: ProductVisualProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (type && isImageUrl(type)) {
    return (
      <div className={`product-visual product-visual--uploaded ${large ? "product-visual--large" : ""}`}>
        {/* Skeleton loader */}
        {isLoading && !hasError && (
          <div className="product-visual__skeleton">
            <div className="product-visual__skeleton-wave"></div>
          </div>
        )}
        {/* Image with error handling */}
        <img
          src={imageSrc(type)}
          alt={alt}
          loading="lazy"
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={`product-visual__image ${hasError ? "product-visual__image--error" : ""}`}
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

  return (
    <div className={visualClassName(type, large)}>
      <span />
      <i />
      <b />
    </div>
  );
}
