import { useRef, useEffect, useState } from "react";
import { animate } from "motion";
import { motion, AnimatePresence } from "motion/react";
import { Video, Shield, Code, ChevronDown, AlignRight, X, ArrowUpRight, Sun, Moon } from "lucide-react";
import { cn } from "../lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface SpotlightNavbarProps {
  onStartMeeting: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  items?: NavItem[];
  onViewChange?: (view: "landing" | "signin" | "signup" | "forgot") => void;
  currentView: string;
  userName?: string;
}

export default function SpotlightNavbar({
  onStartMeeting,
  theme,
  onToggleTheme,
  items = [
    { label: "Features", href: "#features" },
    { label: "Solutions", href: "#about" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
  ],
  onViewChange,
  currentView,
  userName,
}: SpotlightNavbarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for the light positions so we can animate them imperatively
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  // Track page scroll to style the outer header container
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update spotlight position on mouse move
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      // When mouse leaves, spring the spotlight back to the active item
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;

        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 220,
          damping: 22,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  // Handle the "Ambience" (Active Item bottom glow) movement
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);

    if (activeItem) {
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;

      animate(ambienceX.current, targetX, {
        type: "spring",
        stiffness: 220,
        damping: 22,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    }
  }, [activeIndex]);

  const handleItemClick = (item: NavItem, index: number) => {
    setActiveIndex(index);
    if (onViewChange && currentView !== "landing") {
      onViewChange("landing");
      setTimeout(() => {
        const targetId = item.href.replace("#", "");
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
    } else {
      const targetId = item.href.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", item.href);
      }
    }
  };

  return (
    <header
      id="navbar"
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out",
        scrolled
          ? "bg-theme-bg/80 backdrop-blur-xl border-b border-theme-border/40 py-2.5 shadow-lg shadow-black/[0.04] dark:shadow-black/20"
          : "bg-transparent py-4 border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        
        {/* Left Side: Logo */}
        <div
          onClick={() => {
            if (onViewChange) {
              onViewChange("landing");
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-theme-text-primary flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <span className="font-panchang font-extrabold text-theme-bg text-sm z-10 select-none">N</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-theme-bg/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </div>
          <span className="font-panchang font-extrabold text-base tracking-wider text-theme-text-primary transition-colors uppercase">
            Nexus
          </span>
        </div>

        {/* Center Section: Spotlight Navbar (Desktop) */}
        <div className="hidden md:flex relative justify-center">
          <nav
            ref={navRef}
            className="spotlight-nav relative h-10 rounded-full transition-all duration-300 overflow-hidden flex items-center border border-theme-border/40 bg-theme-glass-bg backdrop-blur-md"
          >
            {/* Content list */}
            <ul className="relative flex items-center h-full px-1.5 gap-0 z-10">
              {items.map((item, idx) => (
                <li key={idx} className="relative h-full flex items-center justify-center">
                  <a
                    href={item.href}
                    data-index={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      handleItemClick(item, idx);
                    }}
                    className={cn(
                      "px-4 py-1 text-xs font-medium tracking-wide transition-colors duration-200 rounded-full select-none cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-theme-text-primary/30",
                      activeIndex === idx
                        ? "text-theme-text-primary font-semibold"
                        : "text-theme-text-muted hover:text-theme-text-primary"
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Moving Spotlight */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 w-full h-full z-[1] opacity-0 transition-opacity duration-300"
              style={{
                opacity: hoverX !== null ? 1 : 0,
                background: `radial-gradient(110px circle at var(--spotlight-x) 100%, var(--spotlight-color) 0%, transparent 60%)`,
              }}
            />

            {/* Active Bottom Ambience Light */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
              style={{
                background: `radial-gradient(55px circle at var(--ambience-x) 0%, var(--ambience-color) 0%, transparent 100%)`,
              }}
            />
          </nav>
        </div>

        {/* Right Section: Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="cursor-pointer p-2 rounded-lg text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-text-secondary/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-4.5 h-4.5 transition-transform duration-300 rotate-0 hover:rotate-12" />
            ) : (
              <Sun className="w-4.5 h-4.5 transition-transform duration-300 rotate-0 hover:rotate-45" />
            )}
          </button>

          {userName ? (
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-theme-text-primary border border-theme-border/60 rounded-lg px-3 py-1.5 bg-theme-text-primary/5 select-none">
              ● {userName}
            </span>
          ) : (
            <button
              onClick={() => onViewChange?.("signin")}
              className="text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-theme-text-secondary/10 dark:hover:bg-theme-text-secondary/5"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => onViewChange ? onViewChange("signup") : onStartMeeting()}
            className="cursor-pointer text-xs font-semibold tracking-wider uppercase text-theme-bg bg-theme-text-primary hover:opacity-90 active:scale-[0.98] transition-all px-5 py-2.5 rounded-lg border border-transparent shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_rgba(255,255,255,0.08)]"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Menu Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onToggleTheme}
            className="p-2 text-theme-text-secondary hover:text-theme-text-primary rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-theme-text-primary hover:text-theme-text-primary/80 rounded-lg transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <AlignRight className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed top-[60px] left-0 w-full h-[calc(100vh-60px)] bg-theme-bg/95 backdrop-blur-2xl border-t border-theme-border/50 flex flex-col p-8 z-50"
          >
            <div className="flex flex-col gap-6">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <span
                    onClick={() => {
                      handleItemClick(item, idx);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "text-lg font-display font-medium border-b border-theme-border/45 pb-2 cursor-pointer transition-colors",
                      activeIndex === idx
                        ? "text-theme-text-primary border-theme-text-primary"
                        : "text-theme-text-muted hover:text-theme-text-primary"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4">
              {userName ? (
                <div className="w-full text-center text-xs font-mono font-bold tracking-widest text-theme-text-primary py-3.5 border border-theme-border/60 rounded-xl bg-theme-text-primary/5 select-none">
                  ● ACTIVE NODE: {userName}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onViewChange?.("signin");
                  }}
                  className="w-full text-center text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary py-3 border border-theme-border/60 rounded-xl"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onViewChange) {
                    onViewChange("signup");
                  } else {
                    onStartMeeting();
                  }
                }}
                className="w-full text-center text-sm font-semibold text-theme-bg bg-theme-text-primary hover:opacity-90 py-3.5 rounded-xl shadow-lg"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
        .spotlight-nav {
          --spotlight-color: rgba(0, 0, 0, 0.05);
          --ambience-color: rgba(0, 0, 0, 0.85);
        }
        .dark .spotlight-nav {
          --spotlight-color: rgba(255, 255, 255, 0.12);
          --ambience-color: rgba(255, 255, 255, 1);
        }
      `}} />
    </header>
  );
}
