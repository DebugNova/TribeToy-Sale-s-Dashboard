"use client";

import { useState } from "react";
import { getLabelSignedUrl } from "@/lib/labels/pdf";

/**
 * Fetches a fresh signed URL for a shipment's label PDF and opens it in a new tab,
 * where the browser PDF viewer can print it at A4 100%. Used on the order detail panel
 * and the Shipments list. Signed URLs are short-lived, so we mint one per click rather
 * than embedding it in server-rendered HTML.
 */
export function LabelDownloadButton({
  shipmentId,
  hasLabel,
  className,
  children = "Download / Print label",
}: {
  shipmentId: string;
  hasLabel: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setPending(true);
    const res = await getLabelSignedUrl(shipmentId);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.open(res.data, "_blank", "noopener,noreferrer");
  }

  if (!hasLabel) {
    return <span className="text-xs text-[#a89e90]">No label</span>;
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className={
          className ??
          "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pending ? "Preparing…" : children}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
