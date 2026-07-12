import React from "react";
import { motion } from "motion/react";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -35, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 85,
        damping: 17,
        duration: 0.6,
      }}
      className="relative w-full max-w-md glass-panel-heavy rounded-[28px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-theme-glass-heavy-border/30 hover:border-theme-text-primary/25 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_25px_60px_-10px_rgba(255,255,255,0.03)]"
    >
      {/* Immersive inner ambient glow reflection */}
      <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/[0.03] via-transparent to-transparent pointer-events-none" />
      
      {/* Micro-dot grid background pattern with subtle float parallax */}
      <motion.div 
        animate={{
          y: [0, -3, 0],
          x: [0, 1, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035] bg-[radial-gradient(var(--theme-primary)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" 
      />
      
      <motion.div
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 flex flex-col gap-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

