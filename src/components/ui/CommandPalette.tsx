import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/src/config";
import {
  Search,
  LayoutDashboard,
  User,
  Settings,
  History,
  Brain,
  Video,
  LogIn,
  Moon,
  Sun,
  LogOut,
  Shield,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  group: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const getTheme = () => localStorage.getItem("nexus-theme") || "dark";

  const commands: Command[] = [
    // Navigation
    {
      id: "nav-dashboard",
      label: "Dashboard",
      description: "Go to your dashboard",
      icon: LayoutDashboard,
      group: "Navigate",
      action: () => { navigate("/dashboard"); onClose(); },
      keywords: ["home", "overview"],
    },
    {
      id: "nav-history",
      label: "Meeting History",
      description: "View past meetings",
      icon: History,
      group: "Navigate",
      action: () => { navigate("/history"); onClose(); },
      keywords: ["past", "meetings", "recordings"],
    },
    {
      id: "nav-memory",
      label: "Nexus Memory™",
      description: "Search across all your meetings",
      icon: Brain,
      group: "Navigate",
      action: () => { navigate("/memory"); onClose(); },
      keywords: ["search", "ai", "transcript", "notes"],
    },
    {
      id: "nav-profile",
      label: "Profile",
      description: "Manage your account",
      icon: User,
      group: "Navigate",
      action: () => { navigate("/profile"); onClose(); },
      keywords: ["account", "avatar", "name"],
    },
    {
      id: "nav-settings",
      label: "Settings",
      description: "Customize your experience",
      icon: Settings,
      group: "Navigate",
      action: () => { navigate("/settings"); onClose(); },
      keywords: ["preferences", "theme", "notifications", "language"],
    },
    {
      id: "nav-privacy",
      label: "Privacy Policy",
      icon: Shield,
      group: "Navigate",
      action: () => { navigate("/privacy"); onClose(); },
    },
    {
      id: "nav-terms",
      label: "Terms of Service",
      icon: FileText,
      group: "Navigate",
      action: () => { navigate("/terms"); onClose(); },
    },

    // Actions
    {
      id: "action-start",
      label: "Start Instant Meeting",
      description: "Launch a new meeting room now",
      icon: Video,
      group: "Actions",
      action: async () => {
        onClose();
        const token = localStorage.getItem("nexus_jwt");
        try {
          const res = await apiFetch("/createMeeting", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            navigate(`/meeting/${data.roomCode}`);
          } else {
            throw new Error("Server error");
          }
        } catch {
          const code = "nex-" + Math.floor(100 + Math.random() * 900) + "-" + Math.random().toString(36).slice(2, 5);
          toast("Starting offline meeting", "info");
          navigate(`/meeting/${code}`);
        }
      },
      keywords: ["new", "create", "launch"],
    },
    {
      id: "action-join",
      label: "Join Meeting",
      description: "Enter a room code to join",
      icon: LogIn,
      group: "Actions",
      action: () => {
        onClose();
        navigate("/dashboard");
        // The dashboard has a join modal — user can open it there
        setTimeout(() => toast("Use 'Join' button on dashboard to enter a room code", "info", 4000), 300);
      },
      keywords: ["enter", "room", "code"],
    },
    {
      id: "action-theme",
      label: `Switch to ${getTheme() === "dark" ? "Light" : "Dark"} Mode`,
      description: "Toggle the app theme",
      icon: getTheme() === "dark" ? Sun : Moon,
      group: "Actions",
      action: () => {
        const next = getTheme() === "dark" ? "light" : "dark";
        localStorage.setItem("nexus-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.classList.toggle("light", next === "light");
        toast(`Switched to ${next} mode`, "success", 2000);
        onClose();
      },
      keywords: ["dark", "light", "appearance"],
    },
    {
      id: "action-signout",
      label: "Sign Out",
      description: "Log out of your account",
      icon: LogOut,
      group: "Actions",
      action: async () => {
        onClose();
        await logout();
        navigate("/");
        toast("Signed out successfully", "info");
      },
      keywords: ["logout", "exit"],
    },
  ];

  // Filter commands by query
  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.group.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      })
    : commands;

  // Group the filtered commands
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = filtered; // for keyboard nav index

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[selectedIndex]) {
          flatFiltered[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [flatFiltered, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!user) return null;

  let globalIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-theme-bg/70 backdrop-blur-md"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            className="relative w-full max-w-lg glass-panel-heavy rounded-2xl border border-theme-border shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-theme-border/30">
              <Search className="w-4 h-4 text-theme-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm text-theme-text-primary placeholder-theme-text-secondary/40 outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-theme-border text-[10px] font-mono text-theme-text-muted">
                esc
              </kbd>
            </div>

            {/* Command list */}
            <div
              ref={listRef}
              className="max-h-80 overflow-y-auto py-2 scrollbar-thin"
            >
              {Object.entries(grouped).length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-theme-text-muted">No commands found for "{query}"</p>
                </div>
              ) : (
                Object.entries(grouped).map(([group, cmds]) => (
                  <div key={group}>
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                        {group}
                      </span>
                    </div>
                    {cmds.map((cmd) => {
                      globalIdx++;
                      const idx = globalIdx;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          data-index={idx}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-theme-text-primary/10"
                              : "hover:bg-theme-text-primary/5"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "border-theme-text-primary/30 bg-theme-text-primary/10"
                                : "border-theme-border/40 bg-theme-secondary/30"
                            }`}
                          >
                            <cmd.icon className="w-3.5 h-3.5 text-theme-text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-theme-text-primary block truncate">
                              {cmd.label}
                            </span>
                            {cmd.description && (
                              <span className="text-[11px] text-theme-text-muted block truncate">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <ChevronRight className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-theme-border/20 bg-theme-secondary/20">
              <span className="text-[10px] font-mono text-theme-text-muted flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded border border-theme-border text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="text-[10px] font-mono text-theme-text-muted flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded border border-theme-border text-[10px]">↵</kbd>
                Select
              </span>
              <span className="text-[10px] font-mono text-theme-text-muted flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded border border-theme-border text-[10px]">esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
