"use client";

import { useActionState } from "react";
import {
  updateSettings,
  type SettingsFormState,
} from "./actions";
import { inputClass } from "@/components/form";
import type { Tables } from "@/lib/supabase/database.types";

const initialState: SettingsFormState = { ok: false, message: "" };

const COURIERS = [
  { value: "speedpost", label: "India Post — Speed Post" },
  { value: "delhivery", label: "Delhivery" },
  { value: "other", label: "Other" },
] as const;

function Field({
  label,
  name,
  defaultValue,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-[#574f47]"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className={inputClass}
        {...rest}
      />
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Tables<"settings"> }) {
  const [state, formAction, pending] = useActionState(
    updateSettings,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm shadow-black/[0.03]">
        <legend className="px-1 text-sm font-bold text-[#332f29]">
          Label “FROM” block (sender)
        </legend>

        <Field
          label="Sender name"
          name="sender_name"
          defaultValue={settings.sender_name}
          required
        />
        <Field
          label="Address"
          name="sender_address"
          defaultValue={settings.sender_address}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="City"
            name="sender_city"
            defaultValue={settings.sender_city}
            required
          />
          <Field
            label="State"
            name="sender_state"
            defaultValue={settings.sender_state}
            required
          />
          <Field
            label="Pincode"
            name="sender_pincode"
            defaultValue={settings.sender_pincode}
            inputMode="numeric"
            required
          />
        </div>
        <Field
          label="Phone"
          name="sender_phone"
          defaultValue={settings.sender_phone}
          required
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm shadow-black/[0.03]">
        <legend className="px-1 text-sm font-bold text-[#332f29]">
          Defaults
        </legend>
        <div>
          <label
            htmlFor="default_courier"
            className="mb-1.5 block text-sm font-semibold text-[#574f47]"
          >
            Default courier
          </label>
          <select
            id="default_courier"
            name="default_courier"
            defaultValue={settings.default_courier}
            className={inputClass}
          >
            {COURIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.message && (
          <span
            className={`text-sm font-medium ${
              state.ok ? "text-brand-700" : "text-red-600"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
