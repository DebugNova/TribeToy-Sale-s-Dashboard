"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProduct } from "@/lib/products/actions";
import {
  TextField,
  TextAreaField,
  FieldLabel,
  FormMessage,
  SubmitButton,
} from "@/components/form";
import { buttonSecondaryClass } from "@/components/page-header";
import type { FormState, Product } from "@/lib/types";

const initialState: FormState = { ok: false, message: "" };

export function ProductForm({
  product,
  inventory,
}: {
  product?: Product | null;
  inventory?: { on_hand: number; low_stock_threshold: number } | null;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  const isEdit = Boolean(product);

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="SKU"
            name="sku"
            defaultValue={product?.sku ?? ""}
            required
            placeholder="TOY-DRAGON-01"
          />
          <TextField
            label="Name"
            name="name"
            defaultValue={product?.name ?? ""}
            required
            placeholder="Articulated Dragon"
          />
          <TextField
            label="Category"
            name="category"
            hint="(optional)"
            defaultValue={product?.category ?? ""}
          />
          <div className="flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="active"
                defaultChecked={product ? product.active : true}
                className="h-5 w-5 rounded border-gray-300 accent-brand-600"
              />
              Active (available to sell)
            </label>
          </div>
        </div>
        <TextAreaField
          label="Description"
          name="description"
          hint="(optional)"
          defaultValue={product?.description ?? ""}
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">
          Pricing (INR)
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Selling price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price ?? 0}
            required
          />
          <TextField
            label="Cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.cost ?? 0}
          />
          <TextField
            label="GST tax rate %"
            name="tax_rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.tax_rate ?? 0}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">
          Parcel dimensions
        </legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <TextField label="Length (cm)" name="length_cm" type="number" step="0.01" min="0" defaultValue={product?.length_cm ?? ""} />
          <TextField label="Width (cm)" name="width_cm" type="number" step="0.01" min="0" defaultValue={product?.width_cm ?? ""} />
          <TextField label="Height (cm)" name="height_cm" type="number" step="0.01" min="0" defaultValue={product?.height_cm ?? ""} />
          <TextField label="Weight (g)" name="weight_g" type="number" step="0.01" min="0" defaultValue={product?.weight_g ?? ""} />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Inventory</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isEdit ? (
            <div>
              <FieldLabel htmlFor="on_hand_display">On-hand stock</FieldLabel>
              <input
                id="on_hand_display"
                value={inventory?.on_hand ?? 0}
                disabled
                className="w-full rounded-lg border border-line bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Change stock from the Inventory screen (a reason is required and logged).
              </p>
            </div>
          ) : (
            <TextField
              label="Initial on-hand stock"
              name="on_hand"
              type="number"
              step="1"
              min="0"
              defaultValue={0}
            />
          )}
          <TextField
            label="Low-stock threshold"
            name="low_stock_threshold"
            type="number"
            step="1"
            min="0"
            defaultValue={inventory?.low_stock_threshold ?? 5}
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </SubmitButton>
        <Link href="/products" className={buttonSecondaryClass}>
          Cancel
        </Link>
        <FormMessage ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
