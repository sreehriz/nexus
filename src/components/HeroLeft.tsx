import { motion } from "motion/react";
import { Sparkles, Shield, Users, Smartphone, ArrowRight } from "lucide-react";

interface HeroLeftProps {
  onStartMeeting: () => void;
  onJoinMeeting: () => void;
}

export default function HeroLeft({ onStartMeeting, onJoinMeeting }: HeroLeftProps) {
  const badges = [
    { text: "Crystal-Clear Video", icon: Sparkles, desc: "4K vector compression" },
    { text: "Real-Time Collaboration", icon: Users, desc: "Interactive whiteboard" },
    { text: "Secure Communication", icon: Shield, desc: "Post-quantum encrypted" },
    { text: "Works Across All Devices", icon: Smartphone, desc: "Universal clients" },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20 select-none max-w-3xl mx-auto">
      {/* Premium Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
        className="font-panchang font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-none text-theme-text-primary uppercase"
      >
        Nexus
      </motion.h1>

      {/* Tagline below brand name */}
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.18, ease: "easeOut" }}
        className="font-display font-semibold text-2xl sm:text-3xl lg:text-4xl tracking-wide text-theme-text-secondary mt-4"
      >
        Where Every Voice Matters.
      </motion.h2>

      {/* Supporting Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
        className="text-theme-text-secondary text-xs sm:text-sm md:text-base leading-relaxed mt-6 max-w-xl font-sans font-normal opacity-75 animate-fade-in"
      >
        Connect, collaborate, and share ideas effortlessly with crystal-clear meetings, real-time collaboration, and an experience designed for modern teams.
      </motion.p>

      {/* Call To Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-4 mt-10"
      >
        {/* Primary Start Meeting Button */}
        <button
          onClick={onStartMeeting}
          className="group cursor-pointer relative px-8 py-4 rounded-xl text-sm font-bold text-theme-bg bg-theme-text-primary hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_35px_rgba(255,255,255,0.18)]"
        >
          <span>Start Meeting</span>
          <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Secondary Join Meeting Button */}
        <button
          onClick={onJoinMeeting}
          className="group cursor-pointer px-8 py-4 rounded-xl text-sm font-semibold text-theme-text-primary border border-theme-border/70 dark:border-theme-border/40 backdrop-blur-sm hover:bg-theme-text-secondary/8 dark:hover:bg-theme-text-secondary/5 active:scale-[0.98] transition-all flex items-center gap-2.5 shadow-sm shadow-black/[0.02]"
        >
          <span>Join Meeting</span>
        </button>
      </motion.div>

      {/* Divider line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-theme-border/50 to-transparent mt-12 mb-8"
      />

      {/* Four Compact Feature Badges Grid matching Immersive UI */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full px-4"
      >
        {badges.map((badge, index) => {
          return (
            <div
              key={index}
              className="flex items-center justify-center sm:justify-start gap-3 opacity-75 hover:opacity-100 transition-opacity duration-300"
            >
              <div className="w-1.5 h-1.5 bg-theme-text-primary rounded-full shadow-[0_0_8px_var(--theme-primary)] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest text-theme-text-primary">
                {badge.text}
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
