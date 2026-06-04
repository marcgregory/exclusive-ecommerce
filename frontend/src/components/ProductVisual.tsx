type ProductVisualProps = {
  type?: string;
  large?: boolean;
};

export function ProductVisual({ type, large = false }: ProductVisualProps) {
  return (
    <div className={`product-visual product-visual--${type || "default"} ${large ? "product-visual--large" : ""}`}>
      <span />
      <i />
      <b />
    </div>
  );
}
