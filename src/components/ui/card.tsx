import type { ReactNode, HTMLAttributes } from "react";

type CardVariant = "default" | "glass" | "dark" | "accent" | "outline";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "border border-white/5 bg-white/5 backdrop-blur",
  glass:
    "border border-white/10 bg-black/30 backdrop-blur shadow-[0_15px_50px_rgba(0,0,0,0.35)]",
  dark: "border border-white/5 bg-black/40 backdrop-blur",
  accent:
    "border border-emerald-200/30 bg-emerald-400/10 shadow-[0_15px_45px_rgba(0,0,0,0.4)]",
  outline: "border border-white/10 bg-transparent",
};

const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  children,
  variant = "default",
  padding = "md",
  hover = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${hover ? "transition-colors hover:bg-white/[0.08]" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
