import React from "react";
import { motion } from "motion/react";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 16,
        duration: 0.5,
      }}
      className="relative w-full max-w-md glass-panel-heavy rounded-[28px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-theme-glass-heavy-border/40"
    >
      {/* Immersive inner ambient glow reflection */}
      <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      {/* Micro-dot grid background pattern */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035] bg-[radial-gradient(var(--theme-primary)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col gap-6">
        {children}
      </div>
    </motion.div>
  );
}
