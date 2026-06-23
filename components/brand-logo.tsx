import Image from "next/image";

// TribeToy wordmark + logo. The PNG lives in /public; next/image handles
// responsive sizing and lazy optimisation so it stays light on slow networks.
export function BrandLogo({
  showTagline = true,
  className = "",
  imgClassName = "h-16 w-auto",
}: {
  showTagline?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/tribetoy-logo.png"
        alt="TribeToy"
        width={120}
        height={130}
        priority
        className={`${imgClassName} shrink-0 drop-shadow-sm`}
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-lg font-extrabold tracking-tight text-brand-600">
          TribeToy
        </p>
        {showTagline && (
          <p className="truncate text-[11px] font-semibold text-blush-500">
            Commerce Dashboard
          </p>
        )}
      </div>
    </div>
  );
}
