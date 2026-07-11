import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends HTMLMotionProps<"button"> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

export default function AuthButton({
  children,
  loading = false,
  loadingText = "Loading...",
  variant = "primary",
  className = "",
  disabled,
  ...props
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.012 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      disabled={disabled || loading}
      className={`w-full py-3.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer select-none transition-all duration-300 flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-theme-text-primary/20 ${
        isPrimary
          ? "bg-theme-text-primary text-theme-bg hover:opacity-90 disabled:bg-theme-text-muted/30 disabled:text-theme-text-muted disabled:cursor-not-allowed border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_rgba(255,255,255,0.05)]"
          : "bg-transparent text-theme-text-primary border border-theme-border/80 hover:bg-theme-text-primary/5 hover:border-theme-text-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
