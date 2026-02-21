import type { ReactNode } from "react";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface text-text-primary",
  accent: "bg-emerald-400/20 text-emerald-200",
  success: "bg-emerald-400/20 text-emerald-300",
  warning: "bg-amber-400/20 text-amber-200",
  danger: "bg-rose-400/20 text-rose-200",
  info: "bg-sky-400/20 text-sky-200",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
