import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Sparkles } from "lucide-react";
import CinematicBackground from "../components/CinematicBackground";

export default function NotFoundPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden bg-theme-bg">
      <CinematicBackground theme="dark" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8 px-6"
      >
        {/* Nexus logo */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-theme-text-primary flex items-center justify-center">
            <span className="font-panchang font-extrabold text-theme-bg text-sm">N</span>
          </div>
          <span className="font-panchang font-extrabold text-xl tracking-wider text-theme-text-primary uppercase">
            Nexus
          </span>
        </div>

        {/* Error code */}
        <div className="relative">
          <span className="text-[10rem] md:text-[14rem] font-panchang font-extrabold text-theme-text-primary/[0.04] select-none leading-none">
            404
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-theme-text-muted">
              Node not found
            </span>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-theme-text-primary tracking-tight">
              Signal Lost
            </h1>
          </div>
        </div>

        <p className="text-sm text-theme-text-secondary max-w-md leading-relaxed">
          The page you're looking for has disconnected from the network. It may have been moved, deleted, or never existed.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-theme-border text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-primary transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-4">
          <Sparkles className="w-3.5 h-3.5 text-theme-text-muted" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
            Nexus v4.0 · All systems operational
          </span>
        </div>
      </motion.div>
    </div>
  );
}
