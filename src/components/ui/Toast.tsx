import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  error: "text-red-400 border-red-500/30 bg-red-500/5",
  warning: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  info: "text-blue-400 border-blue-500/30 bg-blue-500/5",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-sm px-4 py-3.5 rounded-xl glass-panel-heavy border shadow-2xl ${colors[t.type]}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-xs font-medium text-theme-text-primary leading-snug">
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors outline-none"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5 text-theme-text-muted" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
