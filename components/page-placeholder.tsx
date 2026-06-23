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
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{description}</p>

      <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Nothing here yet</p>
          <p className="mt-1 text-xs text-gray-400">Coming in {phase}</p>
        </div>
      </div>
    </div>
  );
}
