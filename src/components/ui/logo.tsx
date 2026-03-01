import { Link } from "@/i18n/navigation";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const iconSizes = {
  sm: 24,
  md: 28,
  lg: 36,
};

const fullLogoSizes = {
  sm: { width: 100, height: 24 },
  md: { width: 120, height: 28 },
  lg: { width: 160, height: 36 },
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
