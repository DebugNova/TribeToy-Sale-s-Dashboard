"use client";

// Dashboard filter bar. All state lives in the URL query string (date range + channel / city /
// customer type / category) so a refresh or return keeps the same view. Submitting pushes the
// new query; the SKU-sort param is preserved so changing filters doesn't reset the sort.
// Keyed on the current search string so the controls always mirror the URL (incl. back/forward).

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Constants } from "@/lib/supabase/database.types";
import { CHANNEL_LABEL } from "@/components/status-badge";
import { inputClass } from "@/components/form";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/page-header";

const CUSTOMER_TYPE_LABEL: Record<string, string> = { b2c: "B2C (retail)", b2b: "B2B (dealer)" };

const FILTER_KEYS = ["from", "to", "channel", "city", "customerType", "category"] as const;

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

  const from = sp.get("from") ?? defaults.from;
  const to = sp.get("to") ?? defaults.to;
  const channel = sp.get("channel") ?? "";
  const city = sp.get("city") ?? "";
  const customerType = sp.get("customerType") ?? "";
  const category = sp.get("category") ?? "";

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
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      key={sp.toString()}
      onSubmit={onSubmit}
      className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        From
        <input type="date" name="from" defaultValue={from} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        To
        <input type="date" name="to" defaultValue={to} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Channel
        <select name="channel" defaultValue={channel} className={inputClass}>
          <option value="">All channels</option>
          {Constants.public.Enums.order_channel.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        City
        <select name="city" defaultValue={city} className={inputClass}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Customer type
        <select name="customerType" defaultValue={customerType} className={inputClass}>
          <option value="">All customers</option>
          {Constants.public.Enums.customer_type.map((t) => (
            <option key={t} value={t}>
              {CUSTOMER_TYPE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Category
        <select name="category" defaultValue={category} className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-6">
        <button type="submit" className={buttonPrimaryClass}>
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className={buttonSecondaryClass}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
