"use client";

import { useActionState } from "react";
import {
  updateSettings,
  type SettingsFormState,
} from "./actions";
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
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">
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

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">
          Defaults
        </legend>
        <div>
          <label
            htmlFor="default_courier"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Default courier
          </label>
          <select
            id="default_courier"
            name="default_courier"
            defaultValue={settings.default_courier}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.message && (
          <span
            className={`text-sm ${
              state.ok ? "text-green-700" : "text-red-700"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
