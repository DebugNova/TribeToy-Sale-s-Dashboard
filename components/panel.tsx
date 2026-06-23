// Bordered card with a title bar + optional right-aligned action (CSV button, sort toggle).
// Used for the dashboard charts and table sections so they share one frame.

export function Panel({
  title,
  description,
  action,
  children,
  bodyClassName = "p-4",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm shadow-black/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#332f29]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-[#9a9084]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
