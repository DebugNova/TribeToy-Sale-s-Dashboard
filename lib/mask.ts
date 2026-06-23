// Masking for sensitive fields (customer phone, payment refs). We show the last 4
// characters so a row is still identifiable, but full values are revealed only on an
// explicit, audit-logged action (see lib/sensitive/actions.ts + components/reveal-field.tsx).

const DOT = "•";

/** Mask a phone number to its last 4 digits, e.g. "9876543210" → "••••••3210". */
export function maskPhone(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return DOT.repeat(4);
  return DOT.repeat(Math.max(2, digits.length - 4)) + digits.slice(-4);
}

/** Mask a reference/token to its last 4 characters, e.g. "TXN12345" → "••••2345". */
export function maskRef(value?: string | null): string {
  if (!value) return "—";
  if (value.length <= 4) return DOT.repeat(4);
  return DOT.repeat(4) + value.slice(-4);
}
