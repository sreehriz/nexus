import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, LogIn, Sparkles, AlertCircle, Check, Users, ShieldCheck, Laptop } from "lucide-react";
import SpotlightNavbar from "./components/spotlight-navbar";
import CinematicBackground from "./components/CinematicBackground";
import HeroLeft from "./components/HeroLeft";
import TestimonialsCard from "./components/TestimonialsCard";

type ConnectionStatus = "idle" | "connecting" | "connected";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 85,
      damping: 15,
      duration: 0.7,
    },
  },
};

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("nexus-theme") as "light" | "dark") || (localStorage.getItem("novacall-theme") as "light" | "dark") || "dark"
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("nex-794-slv");
  const [customName, setCustomName] = useState("");
  const [joinError, setJoinError] = useState("");

  // Sync theme to DOM html class and persist
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("nexus-theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleStartMeeting = () => {
    setConnectionStatus("connecting");
    const randomCode = "nex-" + Math.floor(100 + Math.random() * 900) + "-slv";
    setRoomCode(randomCode);
    setTimeout(() => {
      setConnectionStatus("connected");
    }, 1800);
  };

  const handleOpenJoinModal = () => {
    setIsJoinModalOpen(true);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setJoinError("Please enter a valid conference Room ID.");
      return;
    }
    setJoinError("");
    setIsJoinModalOpen(false);
    setConnectionStatus("connecting");
    setTimeout(() => {
      setConnectionStatus("connected");
    }, 1800);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#" + sectionId);
    }
  };

  return (
    <div className="relative min-h-screen text-theme-text-primary overflow-x-hidden flex flex-col font-sans selection:bg-theme-primary/20 selection:text-theme-text-primary">
      {/* 1. Cinematic Background Animation Canvas (Adapts dynamically to theme) */}
      <CinematicBackground theme={theme} />

      {/* 2. Glassmorphic Sticky Header / Navigation */}
      <SpotlightNavbar
        onStartMeeting={handleStartMeeting}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 3. Connection Status Overlay Tag */}
      <AnimatePresence>
        {connectionStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full glass-panel border border-theme-border/60 dark:border-theme-border/40 shadow-xl shadow-black/[0.06] dark:shadow-black/30 flex items-center gap-3.5"
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"}`} />
            <span className="text-[10px] uppercase font-mono tracking-widest text-theme-text-secondary">
              {connectionStatus === "connecting" ? "Routing Link..." : "Matrix Active"}
            </span>
            <div className="h-3 w-px bg-theme-border/40" />
            <span className="text-[11px] font-display uppercase tracking-wider text-theme-text-primary">
              {connectionStatus === "connecting" ? "Negotiating Handshake" : `Node: ${roomCode}`}
            </span>
            {connectionStatus === "connected" && (
              <>
                <div className="h-3 w-px bg-theme-border/40" />
                <button
                  onClick={() => setConnectionStatus("idle")}
                  className="cursor-pointer text-[9px] font-semibold text-red-500 hover:text-red-400 uppercase tracking-widest hover:underline"
                >
                  Disconnect
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Main Centered Content Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center">
        
        {/* HERO SECTION */}
        <section id="hero" className="w-full max-w-4xl mx-auto min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6 md:px-12 pt-[120px] pb-16 sm:pb-24">
          <HeroLeft
            onStartMeeting={handleStartMeeting}
            onJoinMeeting={handleOpenJoinModal}
          />
        </section>

        {/* 1. PRICING SECTION */}
        <section id="pricing" className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary mb-4">
              Simple Pricing for Every Team
            </h2>
            <p className="text-sm md:text-base text-theme-text-secondary max-w-2xl mx-auto leading-relaxed">
              Choose the plan that fits your meetings, from everyday collaboration to advanced business features.
            </p>
          </motion.div>

          {/* Pricing Cards Grid (3 independent containers) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 items-stretch max-w-5xl mx-auto"
          >
            
            {/* Free Plan */}
            <motion.div
              variants={cardVariants}
              className="group relative bg-theme-glass-bg border border-theme-border rounded-[26px] p-8 flex flex-col justify-between shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 hover:-translate-y-1.5 transition-all duration-300 backdrop-blur-md"
            >
              <div>
                <div className="mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">Starter</span>
                  <h3 className="text-xl font-bold text-theme-text-primary mt-1">Free Plan</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl md:text-4xl font-extrabold text-theme-text-primary">₹0</span>
                  <span className="text-xs font-mono text-theme-text-secondary">/ month</span>
                </div>
                <div className="h-px bg-theme-border/20 my-6" />
                <ul className="flex flex-col gap-3.5 mb-8 text-left">
                  {[
                    "Up to 60-minute meetings",
                    "HD Video Calls",
                    "Screen Sharing",
                    "Chat",
                    "Meeting Links",
                    "Basic Security",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                      <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStartMeeting}
                className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-theme-text-primary border border-theme-border hover:border-theme-text-primary rounded-xl transition-all duration-300 hover:bg-theme-text-secondary/5 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              >
                Get Started
              </button>
            </motion.div>

            {/* Pro Plan (Featured) */}
            <motion.div
              variants={cardVariants}
              className={`relative rounded-[26px] p-[1.5px] transition-all duration-500 scale-105 md:scale-[1.03] flex flex-col z-10 ${
                theme === "light"
                  ? "bg-[#111111] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.4)]"
                  : "bg-gradient-to-br from-white/40 via-white/10 to-transparent shadow-[0_0_25px_rgba(255,255,255,0.06)] hover:shadow-[0_0_35px_rgba(255,255,255,0.12)]"
              }`}
            >
              <div className="bg-theme-glass-heavy border border-transparent rounded-[25px] p-8 flex-1 flex flex-col justify-between backdrop-blur-md">
                {/* Most Popular Badge */}
                <div className="absolute -top-3 right-6 px-3.5 py-1 rounded-full bg-theme-text-primary text-theme-bg text-[9px] font-mono uppercase tracking-widest font-extrabold shadow-md">
                  Most Popular
                </div>

                <div>
                  <div className="mb-6">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-primary font-semibold">Featured</span>
                    <h3 className="text-xl font-bold text-theme-text-primary mt-1">Pro Plan</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl md:text-4xl font-extrabold text-theme-text-primary">₹499</span>
                    <span className="text-xs font-mono text-theme-text-secondary">/ month</span>
                  </div>
                  <div className="h-px bg-theme-border/20 my-6" />
                  <ul className="flex flex-col gap-3.5 mb-8 text-left">
                    {[
                      "Unlimited Meeting Duration",
                      "Meeting Recording",
                      "Cloud Storage",
                      "Live Captions",
                      "Meeting Summaries",
                      "Priority Support",
                      "Advanced Collaboration Tools",
                      "Custom Virtual Backgrounds",
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                        <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                        <span className="font-medium text-theme-text-primary">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={handleStartMeeting}
                  className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#FFFFFF] dark:text-[#0B0B0B] bg-theme-text-primary hover:scale-[1.02] active:scale-[0.98] rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Start Pro Trial
                </button>
              </div>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              variants={cardVariants}
              className="group relative bg-theme-glass-bg border border-theme-border rounded-[26px] p-8 flex flex-col justify-between shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 hover:-translate-y-1.5 transition-all duration-300 backdrop-blur-md"
            >
              <div>
                <div className="mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">Scale</span>
                  <h3 className="text-xl font-bold text-theme-text-primary mt-1">Enterprise</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-6 min-h-[40px] flex-wrap">
                  <span className="text-2xl md:text-3xl font-extrabold text-theme-text-primary">Contact Us</span>
                </div>
                <div className="h-px bg-theme-border/20 my-6" />
                <ul className="flex flex-col gap-3.5 mb-8 text-left">
                  {[
                    "Unlimited Participants",
                    "Admin Dashboard",
                    "Team Management",
                    "SSO Authentication",
                    "Advanced Security",
                    "Analytics Dashboard",
                    "API Access",
                    "Dedicated Support",
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                      <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => scrollToSection("contact")}
                className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-theme-text-primary border border-theme-border hover:border-theme-text-primary rounded-xl transition-all duration-300 hover:bg-theme-text-secondary/5 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              >
                Contact Sales
              </button>
            </motion.div>

          </motion.div>
        </section>

        {/* 2. FEATURES SECTION */}
        <section id="features" className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col gap-12"
          >
            {/* Title Block */}
            <motion.div
              variants={cardVariants}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary mb-4">
                Powerful Features
              </h2>
              <p className="text-sm md:text-base text-theme-text-secondary max-w-2xl mx-auto leading-relaxed">
                Explore the features that make Nexus a modern communication platform.
              </p>
            </motion.div>

            {/* TestimonialsCard component serving as a premium feature showcase */}
            <motion.div
              variants={cardVariants}
            >
              <TestimonialsCard
                autoPlay={true}
                autoPlayInterval={4000}
                showNavigation={true}
                showCounter={true}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* 3. ABOUT SECTION */}
        <section id="about" className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 text-left"
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary mb-6">
                Built for Better Conversations
              </h2>
              <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed font-normal">
                Nexus is designed to make online meetings simple, secure, and seamless. Whether you're collaborating with teammates, teaching a class, or connecting with clients, every feature is crafted to help conversations flow naturally without distractions.
              </p>
            </motion.div>
            
            {/* Minimal artistic accent panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-md aspect-[16/10] rounded-2xl glass-panel-heavy border border-theme-border/50 p-6 flex flex-col justify-between overflow-hidden shadow-xl">
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px]" />
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-theme-text-secondary/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-theme-text-secondary/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-theme-text-secondary/20" />
                  </div>
                  <span className="text-[9px] font-mono text-theme-text-muted tracking-widest uppercase">System Core</span>
                </div>
                <div className="my-auto flex flex-col gap-2 py-4">
                  <div className="h-2 w-3/4 rounded bg-theme-text-primary/10" />
                  <div className="h-2 w-1/2 rounded bg-theme-text-primary/10" />
                  <div className="h-2 w-5/6 rounded bg-theme-text-primary/5" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-theme-text-secondary">
                  <span>AES-256 Enabled</span>
                  <span className="text-emerald-500 font-bold">● Operational</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Three elegant info cards with Glassmorphism */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Card 1 */}
            <motion.div
              variants={cardVariants}
              className="group glass-panel hover:bg-theme-surface/75 hover:-translate-y-1.5 shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 transition-all duration-300 p-8 rounded-2xl flex flex-col gap-4 text-left border-transparent"
            >
              <div className="w-10 h-10 rounded-lg bg-theme-text-primary/5 border border-theme-text-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-theme-text-primary" />
              </div>
              <h3 className="text-lg font-bold text-theme-text-primary">Modern Collaboration</h3>
              <p className="text-xs md:text-sm text-theme-text-secondary leading-relaxed font-normal">
                Work in unison with high-fidelity screen sharing, instant room connections, and real-time digital chat channels.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              variants={cardVariants}
              className="group glass-panel hover:bg-theme-surface/75 hover:-translate-y-1.5 shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 transition-all duration-300 p-8 rounded-2xl flex flex-col gap-4 text-left border-transparent"
            >
              <div className="w-10 h-10 rounded-lg bg-theme-text-primary/5 border border-theme-text-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-theme-text-primary" />
              </div>
              <h3 className="text-lg font-bold text-theme-text-primary">Privacy First</h3>
              <p className="text-xs md:text-sm text-theme-text-secondary leading-relaxed font-normal">
                Rest easy with enterprise-grade encryption protocol protecting every stream, meeting code, and audio channel.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              variants={cardVariants}
              className="group glass-panel hover:bg-theme-surface/75 hover:-translate-y-1.5 shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 transition-all duration-300 p-8 rounded-2xl flex flex-col gap-4 text-left border-transparent"
            >
              <div className="w-10 h-10 rounded-lg bg-theme-text-primary/5 border border-theme-text-primary/10 flex items-center justify-center">
                <Laptop className="w-5 h-5 text-theme-text-primary" />
              </div>
              <h3 className="text-lg font-bold text-theme-text-primary">Built for Everyone</h3>
              <p className="text-xs md:text-sm text-theme-text-secondary leading-relaxed font-normal">
                Cross-platform browser-first design means teammates join seamlessly on desktop, mobile, or tablets with zero plugin hassle.
              </p>
            </motion.div>
          </motion.div>
        </section>

      </main>

      {/* 4. PREMIUM FOOTER SECTION */}
      <footer id="contact" className="relative z-10 w-full border-t border-theme-border/25 bg-theme-bg/40 backdrop-blur-md pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 text-left">
          
          {/* Column 1: Brand */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-lg bg-theme-text-primary flex items-center justify-center">
                <span className="font-panchang font-extrabold text-theme-bg text-xs select-none">N</span>
              </div>
              <span className="font-panchang font-extrabold text-base text-theme-text-primary tracking-wider uppercase">
                Nexus
              </span>
            </div>
            <p className="text-xs text-theme-text-secondary leading-relaxed max-w-sm">
              A modern, secure, and lightning-fast video conferencing platform built for seamless global collaboration and crystal-clear connections.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              {["Features", "Pricing", "About", "Contact"].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (item === "Contact") {
                      scrollToSection("contact");
                    } else {
                      scrollToSection(item.toLowerCase());
                    }
                  }}
                  className="text-xs text-theme-text-secondary hover:text-theme-text-primary cursor-pointer text-left transition-colors font-medium outline-none"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Resources */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted">Resources</h4>
            <div className="flex flex-col gap-2.5">
              {["Privacy Policy", "Terms of Service", "Help Center"].map((item) => (
                <span
                  key={item}
                  className="text-xs text-theme-text-secondary hover:text-theme-text-primary cursor-pointer transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-6xl mx-auto px-6 border-t border-theme-border/20 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-theme-text-muted">
          <span>© 2026 Nexus. All rights reserved.</span>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <span>Global Latency: 12ms</span>
            <span>AES-256 Encrypted</span>
            <span>v4.0.12-Stable</span>
          </div>
        </div>
      </footer>

      {/* --- MODAL: JOIN MEETING DIALOG --- */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-theme-bg/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md p-6 rounded-2xl glass-panel-heavy border border-theme-border shadow-[0_20px_50px_rgba(0,0,0,0.14)] dark:shadow-black/70 shadow-2xl flex flex-col gap-5 z-10 text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-theme-text-secondary/15 dark:hover:bg-theme-text-secondary/10 text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-theme-text-secondary" />
                  <h3 className="font-display font-semibold text-lg text-theme-text-primary">
                    Enter Conference Node
                  </h3>
                </div>
                <p className="text-xs text-theme-text-secondary leading-relaxed">
                  Join an active digital conferencing stream securely with global latency routing.
                </p>
              </div>

              <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 mt-2">
                {/* Room ID input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Conference Room ID
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="e.g. nov-794-slv"
                    className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors font-mono"
                    autoFocus
                  />
                </div>

                {/* Optional Display Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Liam Drake"
                    className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors"
                  />
                </div>

                {joinError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-text-secondary hover:text-theme-text-primary glass-pill hover:bg-theme-text-secondary/10 dark:hover:bg-theme-text-secondary/5 rounded-xl border border-theme-border transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 cursor-pointer py-3 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary hover:opacity-90 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-none shadow-lg transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
