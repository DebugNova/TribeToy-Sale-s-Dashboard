"use client";

// Dashboard filter bar. All state lives in the URL query string (date range + channel / city /
// customer type / category) so a refresh or return keeps the same view. Submitting pushes the
// new query; the SKU-sort param is preserved so changing filters doesn't reset the sort.
// Keyed on the current search string so the controls always mirror the URL (incl. back/forward).
// Navigation runs inside a transition so Apply / Reset show a live busy state while the server
// re-aggregates.

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Constants } from "@/lib/supabase/database.types";
import { CHANNEL_LABEL } from "@/components/status-badge";
import { Select, type SelectOption } from "@/components/select";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";
import { Spinner } from "@/components/spinner";
import { DateRangePicker } from "./date-range-picker";

const CUSTOMER_TYPE_LABEL: Record<string, string> = { b2c: "B2C (retail)", b2b: "B2B (dealer)" };

const FILTER_KEYS = ["from", "to", "channel", "city", "customerType", "category"] as const;

// Span-the-grid helper for the header + action rows.
const FULL_SPAN = "col-span-1 sm:col-span-3 lg:col-span-6";

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8076]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  searchable,
}: {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  searchable?: boolean;
}) {
  return (
    <FieldShell label={label}>
      <Select
        name={name}
        defaultValue={value}
        options={options}
        searchable={searchable}
        ariaLabel={label}
      />
    </FieldShell>
  );
}

export function FilterBar({
  cities,
  categories,
  defaults,
}: {
  cities: string[];
  categories: string[];
  defaults: { from: string; to: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = sp.get("from") ?? defaults.from;
  const to = sp.get("to") ?? defaults.to;
  const channel = sp.get("channel") ?? "";
  const city = sp.get("city") ?? "";
  const customerType = sp.get("customerType") ?? "";
  const category = sp.get("category") ?? "";

  // Count the filters the user has explicitly set (drives the "N active" chip + Reset state).
  const activeCount = FILTER_KEYS.filter((k) => sp.get(k)).length;

  // Option lists for the four dimension dropdowns ("" = no filter / "All …").
  const channelOptions: SelectOption[] = [
    { value: "", label: "All channels" },
    ...Constants.public.Enums.order_channel.map((c) => ({ value: c, label: CHANNEL_LABEL[c] })),
  ];
  const cityOptions: SelectOption[] = [
    { value: "", label: "All cities" },
    ...cities.map((c) => ({ value: c, label: c })),
  ];
  const customerTypeOptions: SelectOption[] = [
    { value: "", label: "All customers" },
    ...Constants.public.Enums.customer_type.map((t) => ({
      value: t,
      label: CUSTOMER_TYPE_LABEL[t] ?? t,
    })),
  ];
  const categoryOptions: SelectOption[] = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = (fd.get(key) as string | null)?.trim();
      if (value) params.set(key, value);
    }
    const skuSort = sp.get("skuSort");
    if (skuSort) params.set("skuSort", skuSort);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function onReset() {
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  return (
    <form
      key={sp.toString()}
      onSubmit={onSubmit}
      aria-busy={pending}
      className="mb-6 grid grid-cols-1 gap-x-4 gap-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm shadow-black/[0.03] sm:grid-cols-3 sm:p-5 lg:grid-cols-6"
    >
      {/* Header row */}
      <div className={`${FULL_SPAN} flex items-center justify-between gap-3 border-b border-line pb-3`}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h18M6 12h12M10 20h4" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#332f29]">Filters</h2>
            <p className="text-xs text-[#9a9084]">Refine the dashboard by date, channel &amp; more</p>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {activeCount} active
          </span>
        )}
      </div>

      {/* Fields */}
      <DateRangePicker
        from={from}
        to={to}
        className="col-span-1 sm:col-span-2 lg:col-span-2"
      />
      <FilterSelect label="Channel" name="channel" value={channel} options={channelOptions} />
      <FilterSelect label="City" name="city" value={city} options={cityOptions} searchable />
      <FilterSelect
        label="Customer type"
        name="customerType"
        value={customerType}
        options={customerTypeOptions}
      />
      <FilterSelect
        label="Category"
        name="category"
        value={category}
        options={categoryOptions}
        searchable
      />

      {/* Actions */}
      <div className={`${FULL_SPAN} flex flex-wrap items-center gap-2 border-t border-line pt-4`}>
        <button type="submit" disabled={pending} className={buttonPrimaryClass}>
          {pending ? <Spinner size="sm" /> : (
            <svg
              aria-hidden="true"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          )}
          {pending ? "Applying…" : "Apply filters"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={pending || activeCount === 0}
          className={buttonSecondaryClass}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
