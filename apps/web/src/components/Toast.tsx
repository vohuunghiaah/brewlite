"use client";

import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastProps {
  toast: ToastItem;
  onDismiss?: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-[#10B981]",
      text: "text-white",
    },
    error: {
      icon: XCircle,
      bg: "bg-[#EF4444]",
      text: "text-white",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-[#D97706]",
      text: "text-white",
    },
    info: {
      icon: Info,
      bg: "bg-[#3D261D]",
      text: "text-[#FAF6F0]",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => onDismiss?.(toast.id)}
      className={`animate-fade-in-up flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl ${config.bg} ${config.text} text-sm font-semibold max-w-sm pointer-events-auto cursor-pointer select-none transition-transform hover:scale-[1.02]`}
    >
      <Icon size={18} strokeWidth={2.5} className="shrink-0" />
      <span className="flex-1 leading-snug">{toast.message}</span>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Thông báo hệ thống"
      className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-md w-full px-4 sm:px-0 sm:w-auto"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
