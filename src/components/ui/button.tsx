import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-emerald-400 text-gray-900 hover:bg-emerald-300 font-semibold",
  secondary:
    "border border-white/20 bg-white/10 text-white hover:border-emerald-300/60 hover:text-emerald-100",
  ghost: "text-white/70 hover:text-white hover:bg-white/5",
  outline:
    "border border-white/20 text-white hover:bg-white/5",
  danger:
    "bg-rose-500/20 border border-rose-400/40 text-rose-100 hover:bg-rose-500/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
