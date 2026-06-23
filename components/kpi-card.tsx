// Single dashboard KPI tile. Value is pre-formatted by the page (INR for money, plain count
// otherwise) so this stays a dumb presentational component.

export function KpiCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm shadow-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-md ${
        emphasis ? "border-blush-200" : "border-line"
      }`}
    >
      {/* Soft accent bar tying the tiles to the brand. */}
      <span
        className={`absolute inset-x-0 top-0 h-1 ${
          emphasis ? "bg-blush-400" : "bg-brand-400"
        }`}
      />
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a9084]">
        {label}
      </p>
      <p
        className={`mt-1.5 text-[clamp(1.15rem,4.5vw,1.5rem)] font-extrabold leading-tight tabular-nums tracking-tight ${
          emphasis ? "text-blush-600" : "text-[#332f29]"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-[#a89e90]">{hint}</p>}
    </div>
  );
}
