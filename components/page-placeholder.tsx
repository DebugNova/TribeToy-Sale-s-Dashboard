export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#332f29]">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#7a7066]">{description}</p>

      <div className="mt-6 flex items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-white py-16">
        <div className="text-center">
          <p className="text-sm font-bold text-[#574f47]">Nothing here yet</p>
          <p className="mt-1 text-xs text-[#a89e90]">Coming in {phase}</p>
        </div>
      </div>
    </div>
  );
}
