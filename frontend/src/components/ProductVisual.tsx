import { API_BASE } from "../api/client";

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
  if (type && isImageUrl(type)) {
    return (
      <div className={`product-visual product-visual--uploaded ${large ? "product-visual--large" : ""}`}>
        <img src={imageSrc(type)} alt={alt} loading="lazy" />
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
