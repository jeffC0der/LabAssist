'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type ToastMessage } from '@/context/ToastContext';

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />,
  error:   <XCircle    size={18} className="text-red-400    flex-shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-400  flex-shrink-0" />,
  info:    <Info       size={18} className="text-blue-400   flex-shrink-0" />,
};

const BORDER_COLORS = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  warning: 'border-l-amber-500',
  info:    'border-l-blue-500',
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const { removeToast } = useToast();
  const [exiting, setExiting] = useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => removeToast(toast.id), 280);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 w-80 max-w-full
        bg-slate-800 border border-slate-700 border-l-4 ${BORDER_COLORS[toast.type]}
        rounded-xl p-4 shadow-2xl
        ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
        transition-all
      `}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
