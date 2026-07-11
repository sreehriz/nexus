import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, type = "text", className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5 w-full text-left">
        <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted font-medium">
          {label}
        </label>
        <div className="relative flex items-center group">
          {icon && (
            <div className="absolute left-3.5 text-theme-text-muted/60 group-focus-within:text-theme-text-primary transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`w-full bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border ${
              error
                ? "border-red-500/50 focus:border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                : "border-theme-border/70 focus:border-theme-text-primary/70 focus:shadow-[0_0_12px_rgba(255,255,255,0.05)] dark:focus:shadow-[0_0_15px_rgba(255,255,255,0.06)]"
            } rounded-xl ${
              icon ? "pl-11" : "px-4"
            } pr-11 py-3 text-sm text-theme-text-primary placeholder-theme-text-muted/30 outline-none transition-all duration-300 font-sans ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-text-primary/5 transition-all cursor-pointer outline-none focus:ring-1 focus:ring-theme-text-primary/10"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        <AnimatePresence>
          {error && (
            <motion.span
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="text-[11px] text-red-500 font-medium pl-1 overflow-hidden"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";

export default AuthInput;
