const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a value as Indonesian Rupiah (IDR). */
export function formatIdr(amount: number): string {
  return idr.format(amount);
}
