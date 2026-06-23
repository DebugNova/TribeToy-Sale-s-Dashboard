"use client";

import { useState, useTransition } from "react";
import { revealSensitive, type RevealKey } from "@/lib/sensitive/actions";

/**
 * Shows a masked sensitive value with a "Reveal" affordance. Clicking it calls the
 * server action (which logs a `sensitive.reveal` audit row) and swaps in the full value.
 */
export function RevealField({
  masked,
  revealKey,
  id,
}: {
  masked: string;
  revealKey: RevealKey;
  id: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (value !== null) {
    return <span className="font-mono text-[#3a352f]">{value}</span>;
  }

  // Nothing to reveal (no stored value) — just show the placeholder.
  if (masked === "—") return <span className="text-[#a89e90]">—</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-[#574f47]">{masked}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false);
            try {
              setValue((await revealSensitive(revealKey, id)) ?? "—");
            } catch {
              setError(true);
            }
          })
        }
        className="text-xs font-semibold text-brand-600 underline decoration-dotted underline-offset-2 hover:text-brand-700 disabled:opacity-50"
      >
        {pending ? "…" : error ? "Retry" : "Reveal"}
      </button>
    </span>
  );
}
