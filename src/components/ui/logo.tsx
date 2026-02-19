import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-7 w-7 text-sm",
  md: "h-9 w-9 text-base",
  lg: "h-12 w-12 text-xl",
};

const textClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-xl bg-emerald-400 font-bold text-gray-900 ${sizeClasses[size]}`}
      >
        B
      </div>
      {showText && (
        <div>
          <div className={`font-semibold text-white ${textClasses[size]}`}>
            Bonifatus
          </div>
          <div className="text-xs text-white/60">Upside-first picks</div>
        </div>
      )}
    </Link>
  );
}
