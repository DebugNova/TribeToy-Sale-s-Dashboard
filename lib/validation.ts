// Zod field helpers for parsing FormData (which arrives as strings). Empty strings are
// treated as "absent" so optional fields don't get coerced to 0 / "".

import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;

/** Optional trimmed text -> string | null (empty becomes null). */
export const optionalText = z.preprocess(
  (v) => (blank(v) ? null : String(v).trim()),
  z.string().nullable(),
);

/** Required non-empty trimmed text. */
export const requiredText = z.preprocess(
  (v) => (blank(v) ? "" : String(v).trim()),
  z.string().min(1, "Required"),
);

/** Optional non-negative number -> number | null (empty becomes null). */
export const optionalNumber = z.preprocess(
  (v) => (blank(v) ? null : Number(v)),
  z.number({ error: "Must be a number" }).nonnegative("Cannot be negative").nullable(),
);

/** Required non-negative number, defaulting empty to 0. */
export const moneyOrZero = z.preprocess(
  (v) => (blank(v) ? 0 : Number(v)),
  z.number({ error: "Must be a number" }).nonnegative("Cannot be negative"),
);

/** Non-negative integer, defaulting empty to 0. */
export const intOrZero = z.preprocess(
  (v) => (blank(v) ? 0 : Number(v)),
  z.number({ error: "Must be a whole number" }).int("Must be a whole number").nonnegative("Cannot be negative"),
);

/** Signed integer (used for stock deltas), required. */
export const signedInt = z.preprocess(
  (v) => (blank(v) ? NaN : Number(v)),
  z.number({ error: "Must be a whole number" }).int("Must be a whole number"),
);
