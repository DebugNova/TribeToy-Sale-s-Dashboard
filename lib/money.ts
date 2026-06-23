// Money helpers. All amounts are INR stored as numeric(12,2); compute in JS numbers but
// always round to 2 dp before persisting so we never write float noise to the DB.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Format an INR amount for display, e.g. 1047 -> "₹1,047.00". */
export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
