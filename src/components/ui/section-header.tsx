import type { ReactNode } from "react";

interface SectionHeaderProps {
  overline?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}

export function SectionHeader({
  overline,
  title,
  subtitle,
  action,
  centered = false,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-1 ${centered ? "items-center text-center" : ""} ${action ? "md:flex-row md:items-end md:justify-between" : ""}`}
    >
      <div>
        {overline && (
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            {overline}
          </p>
        )}
        <h2 className="mt-1 text-xl font-semibold text-text-primary md:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-3 md:mt-0">{action}</div>}
    </div>
  );
}
