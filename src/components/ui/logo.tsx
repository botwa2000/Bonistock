import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const iconSizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

const fullLogoSizes = {
  sm: { width: 120, height: 28 },
  md: { width: 150, height: 36 },
  lg: { width: 200, height: 48 },
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSize = iconSizes[size];
  const fullSize = fullLogoSizes[size];

  return (
    <Link href="/" className="flex items-center gap-3">
      {showText ? (
        <Image
          src="/logo.png"
          alt="Bonistock"
          width={fullSize.width}
          height={fullSize.height}
          className="object-contain"
          priority
        />
      ) : (
        <Image
          src="/logo-icon.png"
          alt="Bonistock"
          width={iconSize}
          height={iconSize}
          className="rounded-xl object-contain"
          priority
        />
      )}
    </Link>
  );
}
