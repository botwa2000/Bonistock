import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function Container({
  children,
  className = "",
  size = "xl",
}: ContainerProps) {
  return (
    <div className={`mx-auto w-full px-5 md:px-8 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
}
