import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs text-white/60">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-300/70 transition-colors ${className}`}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Select({
  label,
  id,
  options,
  value,
  onChange,
  className = "",
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs text-white/60">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/70 transition-colors ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
