import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, LogIn, Sparkles, AlertCircle, Check, Users, ShieldCheck, Laptop, Bell, CheckCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SpotlightNavbar from "../components/spotlight-navbar";
import CinematicBackground from "../components/CinematicBackground";
import HeroLeft from "../components/HeroLeft";
import TestimonialsCard from "../components/TestimonialsCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { BACKEND_URL } from "@/src/config";


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 85,
      damping: 15,
      duration: 0.7,
    },
  },
} as const;


const FAQ_ITEMS = [
  {
    q: "Is Nexus free to use?",
    a: "Yes — Nexus is fully open source and free for personal and small team use. You can self-host it with just Python and Node.js. Commercial/enterprise plans with dedicated support are available on request.",
  },
  {
    q: "Do I need an account to join a meeting?",
    a: "No. Guests can join any meeting with just a room code and a display name — no sign-up required. Creating an account unlocks meeting history, Nexus Memory™, and personalised settings.",
  },
  {
    q: "What is Nexus Memory™?",
    a: "Nexus Memory™ is our flagship AI feature that builds a searchable knowledge base from your meeting conversations. Ask natural language questions like 'What did we decide about the Q3 roadmap?' and get AI-ranked results from all your past meetings, powered by Gemini.",
  },
  {
    q: "How does the AI transcription and translation work?",
    a: "Nexus uses the browser's native Web Speech API for real-time captions. If you configure a Gemini API key, live translation is enabled for Japanese, Spanish, German, Hindi, French, and more — all streamed through the backend.",
  },
  {
    q: "Is the video/audio peer-to-peer or server-relayed?",
    a: "Nexus uses a WebRTC P2P mesh topology — your audio and video stream directly between participants' browsers without passing through any server. This gives the lowest possible latency and maximum privacy for small groups (2–8 people).",
  },
  {
    q: "How is my data stored?",
    a: "Chat messages, meeting metadata, and attendance records are stored in a local SQLite database (easily upgraded to PostgreSQL). Video and audio are never stored — only client-side recordings you explicitly initiate are saved, and only to your own device.",
  },
];

function FaqAccordion() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="glass-panel rounded-2xl border border-theme-border/30 overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-semibold text-theme-text-primary pr-4">{item.q}</span>
            <span
              className={`shrink-0 w-5 h-5 rounded-full border border-theme-border flex items-center justify-center text-theme-text-muted transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}
            >
              +
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-theme-text-secondary leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      (localStorage.getItem("nexus-theme") as "light" | "dark") ||
      (localStorage.getItem("novacall-theme") as "light" | "dark") ||
      "dark"
  );
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [starting, setStarting] = useState(false);

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const userName =
    user?.user_metadata?.fullName ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0];

  // Sync theme to DOM
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

  const handleStartMeeting = async () => {
    // If not logged in, redirect to signin
    if (!user) {
      navigate("/signin");
      return;
    }

    setStarting(true);
    const token = localStorage.getItem("nexus_jwt");

    try {
      const res = await fetch(`${BACKEND_URL}/api/createMeeting`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const code = data.roomCode;

        const joinRes = await fetch(`${BACKEND_URL}/api/joinMeeting`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            roomCode: code,
            displayName: userName || "Host",
            userId: user?.id || "",
          }),
        });

        if (joinRes.ok) {
          const joinData = await joinRes.json();
          localStorage.setItem("nexus_room_token", joinData.token);
          localStorage.setItem("nexus_role", joinData.role);
        }

        navigate(`/meeting/${code}`);
      } else {
        throw new Error("Server error");
      }
    } catch {
      // Offline fallback — generate a local room code
      const randomCode =
        "nex-" +
        Math.floor(100 + Math.random() * 900) +
        "-" +
        Math.random().toString(36).slice(2, 5);
      localStorage.setItem("nexus_role", "Organizer");
      toast("Starting offline meeting session", "info");
      navigate(`/meeting/${randomCode}`);
    } finally {
      setStarting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setJoinError("Please enter a valid conference Room ID.");
      return;
    }
    if (!user) {
      navigate("/signin");
      return;
    }

    setJoinError("");
    setIsJoinModalOpen(false);

    try {
      const joinRes = await fetch(`${BACKEND_URL}/api/joinMeeting`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          roomCode: roomCode.trim(),
          displayName: customName.trim() || userName || "Guest",
          userId: user?.id || "",
        }),
      });

      if (joinRes.ok) {
        const joinData = await joinRes.json();
        localStorage.setItem("nexus_room_token", joinData.token);
        localStorage.setItem("nexus_role", joinData.role);
        navigate(`/meeting/${roomCode.trim()}`);
      } else {
        const errData = await joinRes.json();
        setJoinError(errData.detail || "Room is active but locked, or not found.");
        setIsJoinModalOpen(true);
      }
    } catch {
      localStorage.setItem("nexus_role", "Participant");
      navigate(`/meeting/${roomCode.trim()}`);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast("Successfully signed out", "info");
  };

  return (
    <div className="relative min-h-screen text-theme-text-primary overflow-x-hidden flex flex-col font-sans selection:bg-theme-primary/20 selection:text-theme-text-primary">
      <CinematicBackground theme={theme} />

      {/* Navbar */}
      <SpotlightNavbar
        onStartMeeting={handleStartMeeting}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onViewChange={() => {}}
        currentView="landing"
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center w-full">

        {/* HERO SECTION */}
        <section
          id="hero"
          className="w-full max-w-4xl mx-auto min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6 md:px-12 pt-[120px] pb-16 sm:pb-24"
        >
          <HeroLeft
            onStartMeeting={handleStartMeeting}
            onJoinMeeting={() => setIsJoinModalOpen(true)}
          />
        </section>

        {/* PRICING SECTION */}
        <section
          id="pricing"
          className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20"
        >
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
              Choose the plan that fits your meetings, from everyday collaboration to advanced
              business features.
            </p>
          </motion.div>

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
                  <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                    Starter
                  </span>
                  <h3 className="text-xl font-bold text-theme-text-primary mt-1">Free Plan</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl md:text-4xl font-extrabold text-theme-text-primary">₹0</span>
                  <span className="text-xs font-mono text-theme-text-secondary">/ month</span>
                </div>
                <div className="h-px bg-theme-border/20 my-6" />
                <ul className="flex flex-col gap-3.5 mb-8 text-left">
                  {["Up to 60-minute meetings","HD Video Calls","Screen Sharing","Chat","Meeting Links","Basic Security"].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                      <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStartMeeting}
                className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-theme-text-primary border border-theme-border hover:border-theme-text-primary rounded-xl transition-all duration-300 hover:bg-theme-text-secondary/5 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 outline-none"
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
                    {["Unlimited Meeting Duration","Meeting Recording","Cloud Storage","Live Captions","Meeting Summaries","Priority Support","Advanced Collaboration Tools","Custom Virtual Backgrounds"].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                        <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                        <span className="font-medium text-theme-text-primary">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={handleStartMeeting}
                  className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-[#FFFFFF] dark:text-[#0B0B0B] bg-theme-text-primary hover:scale-[1.02] active:scale-[0.98] rounded-xl transition-all duration-300 shadow-md hover:shadow-lg outline-none"
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
                  {["Unlimited Participants","Admin Dashboard","Team Management","SSO Authentication","Advanced Security","Analytics Dashboard","API Access","Dedicated Support"].map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                      <Check className="w-4 h-4 text-theme-text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => scrollToSection("contact")}
                className="w-full cursor-pointer py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-theme-text-primary border border-theme-border hover:border-theme-text-primary rounded-xl transition-all duration-300 hover:bg-theme-text-secondary/5 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 outline-none"
              >
                Contact Sales
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section
          id="features"
          className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col gap-12"
          >
            <motion.div variants={cardVariants} className="text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary mb-4">
                Powerful Features
              </h2>
              <p className="text-sm md:text-base text-theme-text-secondary max-w-2xl mx-auto leading-relaxed">
                Explore the features that make Nexus a modern communication platform.
              </p>
            </motion.div>
            <motion.div variants={cardVariants}>
              <TestimonialsCard autoPlay={true} autoPlayInterval={4000} showNavigation={true} showCounter={true} />
            </motion.div>
          </motion.div>
        </section>

        {/* ABOUT SECTION */}
        <section
          id="about"
          className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20 mb-16"
        >
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
                Nexus is designed to make online meetings simple, secure, and seamless. Whether you're collaborating
                with teammates, teaching a class, or connecting with clients, every feature is crafted to help
                conversations flow naturally without distractions.
              </p>
            </motion.div>

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

          {/* ABOUT CARDS */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
          >
            {[
              { icon: Users, title: "Modern Collaboration", desc: "Work in unison with high-fidelity screen sharing, instant room connections, and real-time digital chat channels." },
              { icon: ShieldCheck, title: "Privacy First", desc: "Rest easy with enterprise-grade encryption protocol protecting every stream, meeting code, and audio channel." },
              { icon: Laptop, title: "Built for Everyone", desc: "Cross-platform browser-first design means teammates join seamlessly on desktop, mobile, or tablets with zero plugin hassle." },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={cardVariants}
                className="group glass-panel hover:bg-theme-surface/75 hover:-translate-y-1.5 shadow-xl dark:shadow-black/40 hover:shadow-2xl dark:hover:shadow-black/60 transition-all duration-300 p-8 rounded-2xl flex flex-col gap-4 text-left border-transparent"
              >
                <div className="w-10 h-10 rounded-lg bg-theme-text-primary/5 border border-theme-text-primary/10 flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-theme-text-primary" />
                </div>
                <h3 className="text-lg font-bold text-theme-text-primary">{card.title}</h3>
                <p className="text-xs md:text-sm text-theme-text-secondary leading-relaxed font-normal">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* NEXUS MEMORY™ SHOWCASE */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-theme-text-primary/10 border border-theme-border flex items-center justify-center">
                  <Bell className="w-4 h-4 text-theme-text-primary" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted">
                  Flagship Feature
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary">
                Nexus Memory™
              </h2>
              <p className="text-sm text-theme-text-secondary leading-relaxed">
                Ask your meetings anything. Nexus Memory™ builds a searchable, AI-powered knowledge base from every conversation you've had. Natural language search across unlimited meeting history — powered by Gemini.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Natural language search: \"What did we decide about Q3?\"",
                  "Cross-meeting results ranked by AI relevance",
                  "Full timeline with speaker attribution",
                  "Export results to Markdown or PDF",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-theme-text-secondary">
                    <Sparkles className="w-3.5 h-3.5 text-theme-text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 mt-2">
                {user ? (
                  <Link
                    to="/memory"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 transition-all"
                  >
                    Try Nexus Memory
                  </Link>
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 transition-all"
                  >
                    Get Started Free
                  </Link>
                )}
              </div>
            </div>

            {/* Animated Memory Demo */}
            <div className="relative glass-panel-heavy rounded-2xl border border-theme-border/40 p-5 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md bg-theme-text-primary/10 border border-theme-border flex items-center justify-center">
                  <span className="text-[8px] font-mono text-theme-text-muted">AI</span>
                </div>
                <span className="text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">Nexus Memory</span>
                <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Fake search bar */}
              <div className="flex items-center gap-2 bg-theme-secondary/40 border border-theme-border rounded-xl px-3 py-2.5 mb-4">
                <span className="w-3 h-3 text-theme-text-muted">⌕</span>
                <span className="text-xs text-theme-text-secondary font-mono">What did we decide about the auth system?</span>
                <span className="ml-auto text-[9px] text-theme-text-muted">↵</span>
              </div>

              {/* Fake AI summary */}
              <div className="bg-theme-text-primary/5 border border-theme-border/30 rounded-xl p-3 mb-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted mb-1">AI Summary</p>
                <p className="text-xs text-theme-text-secondary leading-relaxed">The team decided to standardize on FastAPI JWT authentication, removing the Supabase dependency for portability.</p>
              </div>

              {/* Fake results */}
              {[
                { room: "nex-794-slv", time: "3 days ago", speaker: "Alex K.", text: "Let's go with JWT — simpler to deploy without Supabase." },
                { room: "nex-210-qrd", time: "1 week ago", speaker: "Maya R.", text: "Agreed. FastAPI auth is production-ready right now." },
              ].map((r, i) => (
                <div key={i} className="glass-panel rounded-xl p-3 mb-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-theme-text-muted">{r.room}</span>
                    <span className="text-[9px] font-mono text-theme-text-muted">{r.time}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-theme-text-muted uppercase">{r.speaker} </span>
                    <span className="text-xs text-theme-text-primary">{r.text}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-0.5 rounded-full bg-theme-border/20">
                      <div className="h-full rounded-full bg-theme-text-primary/40" style={{ width: `${88 - i * 15}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-theme-text-muted">{88 - i * 15}% match</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* WHY NEXUS — COMPARISON TABLE */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-10"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-theme-text-primary mb-3">
                Why Nexus?
              </h2>
              <p className="text-sm text-theme-text-secondary max-w-xl mx-auto">
                Built for teams who expect more than a commodity video call.
              </p>
            </div>

            <div className="glass-panel rounded-2xl border border-theme-border/30 overflow-hidden">
              <div className="grid grid-cols-4 text-center">
                {/* Header */}
                <div className="px-4 py-4 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">Feature</span>
                </div>
                {["Nexus", "Google Meet", "Zoom"].map((product, i) => (
                  <div key={product} className={`px-4 py-4 border-l border-theme-border/20 ${i === 0 ? "bg-theme-text-primary/5" : ""}`}>
                    <span className={`text-xs font-bold ${i === 0 ? "text-theme-text-primary" : "text-theme-text-muted"}`}>{product}</span>
                  </div>
                ))}

                {/* Rows */}
                {[
                  ["AI Meeting Memory™", "✓", "✗", "✗"],
                  ["Real-time AI Captions", "✓", "✓ (limited)", "✓ (paid)"],
                  ["No account needed to join", "✓", "✗", "✗"],
                  ["Gemini AI Summaries", "✓", "✗", "✗"],
                  ["End-to-end Encryption", "✓", "✓", "✓ (paid)"],
                  ["Self-hostable", "✓", "✗", "✗"],
                  ["Whiteboard + Notes", "✓", "✓", "✓ (paid)"],
                  ["Price", "Free / Open Source", "$0–18/mo", "$15+/mo"],
                ].map(([feature, ...vals]) => (
                  <React.Fragment key={feature as string}>
                    <div className="px-4 py-3.5 border-t border-theme-border/15 text-xs text-theme-text-secondary text-left">
                      {feature}
                    </div>
                    {vals.map((val, i) => (
                      <div key={i} className={`px-4 py-3.5 border-t border-l border-theme-border/15 text-xs text-center ${i === 0 ? "bg-theme-text-primary/5 font-semibold text-theme-text-primary" : val === "✗" ? "text-theme-text-muted/50" : "text-theme-text-secondary"}`}>
                        {val}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* FAQ SECTION */}
        <section className="w-full max-w-3xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-10"
          >
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold tracking-tight text-theme-text-primary mb-3">
                Frequently Asked Questions
              </h2>
            </div>
            <FaqAccordion />
          </motion.div>
        </section>

        {/* CONTACT FORM SECTION */}
        <section id="contact-form" className="w-full max-w-2xl mx-auto px-6 py-24 border-t border-theme-border/20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-8 text-left"
          >
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold tracking-tight text-theme-text-primary mb-3">
                Get in Touch
              </h2>
              <p className="text-sm text-theme-text-secondary">
                Have questions or feedback? Drop us a line and our team will get back to you.
              </p>
            </div>

            <ContactForm />
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        id="contact"
        className="relative z-10 w-full border-t border-theme-border/25 bg-theme-bg/40 backdrop-blur-md pt-20 pb-10"
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 text-left">
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-theme-text-primary flex items-center justify-center">
                <span className="font-panchang font-extrabold text-theme-bg text-xs select-none">N</span>
              </div>
              <span className="font-panchang font-extrabold text-base text-theme-text-primary tracking-wider uppercase">Nexus</span>
            </div>
            <p className="text-xs text-theme-text-secondary leading-relaxed max-w-sm">
              A modern, secure, and lightning-fast video conferencing platform built for seamless global collaboration
              and crystal-clear connections.
            </p>
          </div>

          <div className="md:col-span-3 flex flex-col gap-4">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Features", section: "features" },
                { label: "Pricing", section: "pricing" },
                { label: "About", section: "about" },
                { label: "Contact", section: "contact" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.section)}
                  className="text-xs text-theme-text-secondary hover:text-theme-text-primary cursor-pointer text-left transition-colors font-medium outline-none"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted">Resources</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/privacy" className="text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors">
                Terms of Service
              </Link>
              <a href="mailto:hello@nexus.app" className="text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors">
                Help Center
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-theme-border/20 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-mono text-theme-text-muted">
          <span>© 2026 Nexus. All rights reserved.</span>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <span>Global Latency: 12ms</span>
            <span>AES-256 Encrypted</span>
            <span>v4.0.12-Stable</span>
          </div>
        </div>
      </footer>

      {/* JOIN MEETING MODAL */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-theme-bg/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md p-6 rounded-2xl glass-panel-heavy border border-theme-border shadow-[0_20px_50px_rgba(0,0,0,0.14)] dark:shadow-black/70 shadow-2xl flex flex-col gap-5 z-10 text-left"
            >
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-theme-text-secondary/15 dark:hover:bg-theme-text-secondary/10 text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer outline-none"
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Conference Room ID
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="e.g. nex-794-slv"
                    className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors font-mono"
                    autoFocus
                  />
                </div>

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
                    className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-text-secondary hover:text-theme-text-primary glass-pill hover:bg-theme-text-secondary/10 dark:hover:bg-theme-text-secondary/5 rounded-xl border border-theme-border transition-colors cursor-pointer outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 cursor-pointer py-3 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary hover:opacity-90 rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-all outline-none"
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

function ContactForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      toast("Please fill in all contact parameters.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message })
      });
      if (res.ok) {
        setSuccess(true);
        toast("Message sent successfully. Link established.", "success");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        const d = await res.json();
        toast(d.detail || "Submission pipeline error.", "error");
      }
    } catch {
      toast("Connection to Nexus server interrupted.", "error");
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-theme-border/20 text-center flex flex-col items-center gap-4">
        <CheckCircle className="w-12 h-12 text-[#38EF7D]" />
        <h3 className="text-xl font-bold text-theme-text-primary">Transmission Delivered</h3>
        <p className="text-xs text-theme-text-secondary leading-relaxed">
          Your secure contact handshake has been sent. Our team will link back on your frequency soon.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs font-mono uppercase tracking-wider text-theme-text-primary hover:underline outline-none"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border border-theme-border/20 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Elena Rostova"
            className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/35 outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. elena@nexus.dev"
            className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/35 outline-none transition-colors"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">Subject</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Integration options"
          className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/35 outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">Message</label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="bg-theme-secondary/40 hover:bg-theme-secondary/60 focus:bg-theme-secondary/60 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/35 outline-none transition-colors resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full cursor-pointer py-3.5 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary hover:opacity-90 disabled:opacity-50 rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-all outline-none"
      >
        {sending ? (
          <div className="w-4 h-4 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />
        ) : (
          <span>Transmit Handshake</span>
        )}
      </button>
    </form>
  );
}
