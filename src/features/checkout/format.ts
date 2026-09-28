/** PKR as integer rupees → "Rs 1,699". Grouping is fixed (not locale-dependent). */
export function formatPkr(rupees: number): string {
  const n = Math.round(rupees);
  const sign = n < 0 ? "-" : "";
  return `${sign}Rs ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
