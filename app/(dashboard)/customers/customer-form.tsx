"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCustomer } from "@/lib/customers/actions";
import {
  TextField,
  SelectField,
  TextAreaField,
  FormMessage,
  SubmitButton,
} from "@/components/form";
import { buttonSecondaryClass } from "@/components/page-header";
import type { FormState, Customer } from "@/lib/types";

const initialState: FormState = { ok: false, message: "" };

export function CustomerForm({ customer }: { customer?: Customer | null }) {
  const [state, formAction, pending] = useActionState(saveCustomer, initialState);
  const isEdit = Boolean(customer);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {customer && <input type="hidden" name="id" value={customer.id} />}

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Name" name="name" defaultValue={customer?.name ?? ""} required />
          <SelectField label="Type" name="type" defaultValue={customer?.type ?? "b2c"}>
            <option value="b2c">B2C (consumer)</option>
            <option value="b2b">B2B (dealer)</option>
          </SelectField>
          <TextField
            label="Phone"
            name="phone"
            hint="(optional)"
            defaultValue={customer?.phone ?? ""}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            hint="(optional)"
            defaultValue={customer?.email ?? ""}
          />
          <TextField
            label="GSTIN"
            name="gstin"
            hint="(B2B, optional)"
            defaultValue={customer?.gstin ?? ""}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Address</legend>
        <TextField
          label="Address"
          name="address_line"
          hint="(optional)"
          defaultValue={customer?.address_line ?? ""}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="City" name="city" defaultValue={customer?.city ?? ""} />
          <TextField label="State" name="state" defaultValue={customer?.state ?? ""} />
          <TextField
            label="Pincode"
            name="pincode"
            inputMode="numeric"
            defaultValue={customer?.pincode ?? ""}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-line bg-white p-6">
        <legend className="px-1 text-sm font-semibold text-gray-900">Notes</legend>
        <TextAreaField
          label="Internal notes"
          name="notes"
          hint="(optional)"
          defaultValue={customer?.notes ?? ""}
        />
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
        </SubmitButton>
        <Link href="/customers" className={buttonSecondaryClass}>
          Cancel
        </Link>
        <FormMessage ok={state.ok} message={state.message} />
      </div>
    </form>
  );
}
