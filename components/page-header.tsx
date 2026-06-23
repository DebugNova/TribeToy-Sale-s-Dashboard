// Consistent page title block with an optional right-aligned action (usually a link button).

export const buttonPrimaryClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 focus-visible:outline-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const buttonSecondaryClass =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-[#5a524a] shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-[#332f29] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[#7a7066]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
