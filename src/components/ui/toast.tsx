"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export function Toast({ message, variant = "info", duration = 5000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${variantStyles[variant]}`}
      >
        {message}
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="ml-3 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
