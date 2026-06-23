"use client";

import { useActionState, useEffect, useState } from "react";
import { adjustStock } from "@/lib/inventory/actions";
import { inputClass, SubmitButton } from "@/components/form";
import { buttonSecondaryClass } from "@/components/page-header";
import type { FormState } from "@/lib/types";

const initialState: FormState = { ok: false, message: "" };

type Current = { on_hand: number; damaged: number; low_stock_threshold: number };

function AdjustModal({
  productId,
  productName,
  current,
  onClose,
}: {
  productId: string;
  productName: string;
  current: Current;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(adjustStock, initialState);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900">Adjust stock</h2>
        <p className="mt-0.5 text-sm text-gray-500">{productName}</p>
        <p className="mt-2 text-xs text-gray-400">
          On hand {current.on_hand} · Damaged {current.damaged} · Threshold{" "}
          {current.low_stock_threshold}
        </p>

        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="product_id" value={productId} />

          <div>
            <label
              htmlFor="field"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Field
            </label>
            <select id="field" name="field" defaultValue="on_hand" className={inputClass}>
              <option value="on_hand">On-hand stock</option>
              <option value="damaged">Damaged stock</option>
              <option value="low_stock_threshold">Low-stock threshold</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="delta"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Change (+/−)
            </label>
            <input
              id="delta"
              name="delta"
              type="number"
              step="1"
              required
              placeholder="e.g. 10 to add, -2 to remove"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Reason <span className="text-red-600">*</span>
            </label>
            <input
              id="reason"
              name="reason"
              type="text"
              required
              placeholder="Stock count, damage, restock…"
              className={inputClass}
            />
          </div>

          {!state.ok && state.message && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={buttonSecondaryClass}>
              Cancel
            </button>
            <SubmitButton pending={pending}>
              {pending ? "Saving…" : "Save adjustment"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdjustStockButton({
  productId,
  productName,
  current,
}: {
  productId: string;
  productName: string;
  current: Current;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-gray-900 hover:underline"
      >
        Adjust
      </button>
      {open && (
        <AdjustModal
          productId={productId}
          productName={productName}
          current={current}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
