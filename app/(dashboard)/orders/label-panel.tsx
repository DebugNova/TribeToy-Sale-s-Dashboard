"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateLabel, updateShipmentAwb } from "@/lib/labels/pdf";
import { LabelDownloadButton } from "@/components/label-download-button";
import { inputClass } from "@/components/form";
import { Select } from "@/components/select";
import { buttonSecondaryClass } from "@/components/page-header";
import { COURIER_LABEL } from "@/lib/labels/courier";
import { Constants } from "@/lib/supabase/database.types";
import type { CourierType } from "@/lib/types";

export type ShipmentSummary = {
  id: string;
  courier: CourierType;
  awb: string | null;
  dispatch_date: string | null;
  label_pdf_url: string | null;
};

export type LabelHistoryEntry = {
  id: string;
  action: string;
  who: string;
  when: string;
  version: number | null;
};

const ACTION_LABEL: Record<string, string> = {
  "shipment.label_generated": "Label generated",
  "shipment.reprint": "Reprinted",
  "shipment.awb_update": "AWB / dispatch updated",
};

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function todayIST(): string {
  // en-CA renders as YYYY-MM-DD, which is what <input type="date"> expects.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function LabelPanel({
  orderId,
  canGenerate,
  defaultCourier,
  shipment,
  history,
}: {
  orderId: string;
  canGenerate: boolean;
  defaultCourier: CourierType;
  shipment: ShipmentSummary | null;
  history: LabelHistoryEntry[];
}) {
  const router = useRouter();

  const [courier, setCourier] = useState<CourierType>(
    shipment?.courier ?? defaultCourier,
  );
  const [awb, setAwb] = useState(shipment?.awb ?? "");
  const [dispatchDate, setDispatchDate] = useState(
    shipment?.dispatch_date ?? todayIST(),
  );

  const [busy, setBusy] = useState<null | "generate" | "reprint" | "awb">(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onGenerate(reprint: boolean) {
    setError(null);
    setMessage(null);
    setBusy(reprint ? "reprint" : "generate");
    const res = await generateLabel(orderId, {
      courier,
      awb: awb.trim() || null,
      dispatchDate: dispatchDate || null,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage(
      res.data.reprint
        ? `Reprinted (version ${res.data.version}).`
        : "Label generated.",
    );
    if (res.data.signedUrl) {
      window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
    }
    router.refresh();
  }

  async function onSaveAwb() {
    setError(null);
    setMessage(null);
    setBusy("awb");
    const res = await updateShipmentAwb(
      shipment!.id,
      awb.trim() || null,
      dispatchDate || null,
    );
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMessage("AWB / dispatch saved. Reprint to refresh the PDF + QR.");
    router.refresh();
  }

  const courierSelect = (
    <Select
      value={courier}
      onValueChange={(v) => setCourier(v as CourierType)}
      ariaLabel="Courier"
      options={Constants.public.Enums.courier_type.map((c) => ({
        value: c,
        label: COURIER_LABEL[c],
      }))}
    />
  );

  return (
    <div className="space-y-4">
      {!shipment ? (
        canGenerate ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Generate the A4 shipping label for this order. You can add the India Post
              AWB now or after booking at the counter.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Courier
                </label>
                {courierSelect}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  AWB / tracking (optional)
                </label>
                <input
                  type="text"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                  placeholder="e.g. ES016693300IN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Dispatch date
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={busy !== null}
              className={primaryBtn}
            >
              {busy === "generate" ? "Generating…" : "Generate label"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Move the order to <span className="font-medium">Packed</span> to generate its
            shipping label.
          </p>
        )
      ) : (
        <div className="space-y-5">
          {/* Download + reprint */}
          <div className="flex flex-wrap items-center gap-3">
            <LabelDownloadButton
              shipmentId={shipment.id}
              hasLabel={!!shipment.label_pdf_url}
            />
            <button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={busy !== null}
              className={buttonSecondaryClass}
            >
              {busy === "reprint" ? "Reprinting…" : "Reprint label"}
            </button>
          </div>

          {/* AWB / courier / dispatch edit */}
          <div className="rounded-xl border border-line bg-cream-100/60 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9a9084]">
              Courier &amp; tracking
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Courier
                </label>
                {courierSelect}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  AWB / tracking
                </label>
                <input
                  type="text"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                  placeholder="e.g. ES016693300IN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Dispatch date
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={onSaveAwb}
                disabled={busy !== null}
                className={primaryBtn}
              >
                {busy === "awb" ? "Saving…" : "Save AWB / dispatch"}
              </button>
            </div>
          </div>

          {/* Print history */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Print history
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No label events yet.</p>
            ) : (
              <ol className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-sm">
                    <span className="text-gray-800">
                      {ACTION_LABEL[h.action] ?? h.action}
                      {h.version ? ` · v${h.version}` : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {" "}
                      — {h.who} · {h.when}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && !error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
    </div>
  );
}
