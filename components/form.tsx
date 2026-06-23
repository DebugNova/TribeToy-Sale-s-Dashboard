// Small presentational form primitives shared across the create/edit forms. No hooks, so
// these can render in either server or client components; they just keep Tailwind styling
// consistent with the Phase 0 shell (see app/(dashboard)/settings/settings-form.tsx).

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Spinner } from "@/components/spinner";
import { Select, type SelectOption } from "@/components/select";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-[#3a352f] outline-none transition placeholder:text-[#b3a99b] focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:bg-cream-100 disabled:text-[#9a9084]";

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-[#574f47]"
    >
      {children}
      {hint && <span className="ml-1 font-normal text-[#a89e90]">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <FieldLabel htmlFor={name} hint={hint}>
        {label}
      </FieldLabel>
      <input id={name} name={name} className={inputClass} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  hint,
  options,
  defaultValue = "",
  searchable,
}: {
  label: string;
  name: string;
  hint?: string;
  options: SelectOption[];
  defaultValue?: string;
  searchable?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} hint={hint}>
        {label}
      </FieldLabel>
      <Select
        id={name}
        name={name}
        options={options}
        defaultValue={defaultValue}
        searchable={searchable}
        ariaLabel={label}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <FieldLabel htmlFor={name} hint={hint}>
        {label}
      </FieldLabel>
      <textarea id={name} name={name} className={inputClass} rows={3} {...rest} />
    </div>
  );
}

export function FormMessage({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null;
  return (
    <span className={`text-sm font-medium ${ok ? "text-brand-700" : "text-red-600"}`}>
      {message}
    </span>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Spinner size="sm" />}
      {children}
    </button>
  );
}
