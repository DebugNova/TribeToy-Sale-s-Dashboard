// Small presentational form primitives shared across the create/edit forms. No hooks, so
// these can render in either server or client components; they just keep Tailwind styling
// consistent with the Phase 0 shell (see app/(dashboard)/settings/settings-form.tsx).

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500";

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
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
      {children}
      {hint && <span className="ml-1 font-normal text-gray-400">{hint}</span>}
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
  children,
  ...rest
}: { label: string; name: string; hint?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <FieldLabel htmlFor={name} hint={hint}>
        {label}
      </FieldLabel>
      <select id={name} name={name} className={inputClass} {...rest}>
        {children}
      </select>
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
    <span className={`text-sm ${ok ? "text-green-700" : "text-red-700"}`}>{message}</span>
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
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
