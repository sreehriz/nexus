import React, { useState } from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: React.ReactNode;
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.012 }}
      whileTap={disabled || loading ? {} : { scale: 0.985 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled || loading}
      className={`relative w-full py-3.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer select-none overflow-hidden transition-all duration-300 flex items-center justify-center gap-2 outline-none ${
        isPrimary
          ? "bg-theme-text-primary text-theme-bg hover:opacity-95 disabled:bg-theme-text-muted/30 disabled:text-theme-text-muted disabled:cursor-not-allowed border border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] focus:ring-1 focus:ring-theme-text-primary/30"
          : "bg-transparent text-theme-text-primary border border-theme-border hover:bg-theme-text-primary/5 hover:border-theme-text-primary/50 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-1 focus:ring-theme-text-primary/20"
      } ${className}`}
      {...props}
    >
      {/* Sheen sweep animation on hover */}
      {isPrimary && !disabled && !loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          initial={{ x: "-100%" }}
          animate={isHovered ? { x: "100%" } : { x: "-100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}

