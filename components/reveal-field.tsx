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
    return <span className="font-mono text-gray-900">{value}</span>;
  }

  // Nothing to reveal (no stored value) — just show the placeholder.
  if (masked === "—") return <span className="text-gray-400">—</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-gray-700">{masked}</span>
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
        className="text-xs font-medium text-gray-500 underline decoration-dotted hover:text-gray-900 disabled:opacity-50"
      >
        {pending ? "…" : error ? "Retry" : "Reveal"}
      </button>
    </span>
  );
}
