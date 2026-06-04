export function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}
