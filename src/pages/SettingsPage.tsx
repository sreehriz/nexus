import React, { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Bell, Video, Mic, VideoOff, MicOff, Globe, CheckCircle } from "lucide-react";
import { useToast } from "../context/ToastContext";
import CinematicBackground from "../components/CinematicBackground";

type Preference = {
  autoMute: boolean;
  autoVideoOff: boolean;
  notifyOnJoin: boolean;
  notifyOnChat: boolean;
  captionsEnabled: boolean;
  language: string;
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Mandarin" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
];

function ToggleRow({
  label,
  description,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-theme-border/20 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-theme-text-muted mt-0.5 shrink-0" />}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-theme-text-primary">{label}</span>
          <span className="text-xs text-theme-text-secondary">{description}</span>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          value ? "bg-theme-text-primary" : "bg-theme-border"
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-theme-bg shadow transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();

  const getStoredTheme = () =>
    (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark";

  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme());

  const [prefs, setPrefs] = useState<Preference>(() => {
    try {
      const stored = localStorage.getItem("nexus_prefs");
      return stored
        ? JSON.parse(stored)
        : {
            autoMute: false,
            autoVideoOff: false,
            notifyOnJoin: true,
            notifyOnChat: true,
            captionsEnabled: false,
            language: "en",
          };
    } catch {
      return {
        autoMute: false,
        autoVideoOff: false,
        notifyOnJoin: true,
        notifyOnChat: true,
        captionsEnabled: false,
        language: "en",
      };
    }
  });

  const updatePref = (key: keyof Preference, value: boolean | string) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("nexus_prefs", JSON.stringify(next));
    toast("Preference saved", "success", 2000);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("nexus-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
    toast(`Switched to ${next} mode`, "info", 2000);
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
      <CinematicBackground theme={theme} />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-theme-text-muted hover:text-theme-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-theme-text-primary">Settings</h1>
            <p className="text-sm text-theme-text-secondary mt-1">Customize your Nexus experience</p>
          </div>

          {/* Theme */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-theme-text-primary">Appearance</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-theme-text-muted mt-0.5" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 mt-0.5" />
                )}
                <div>
                  <span className="text-sm font-medium text-theme-text-primary">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </span>
                  <p className="text-xs text-theme-text-secondary mt-0.5">
                    {theme === "dark"
                      ? "Optimized for low-light environments"
                      : "Bright and clear for daylight use"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-border text-xs font-semibold text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-primary transition-all"
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
                Switch to {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>

          {/* Meeting defaults */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-theme-text-primary mb-2">Meeting Defaults</h2>
            <ToggleRow
              icon={MicOff}
              label="Join meetings muted"
              description="Automatically mute your microphone when joining any meeting"
              value={prefs.autoMute}
              onChange={(v) => updatePref("autoMute", v)}
            />
            <ToggleRow
              icon={VideoOff}
              label="Join with camera off"
              description="Automatically disable your camera when joining any meeting"
              value={prefs.autoVideoOff}
              onChange={(v) => updatePref("autoVideoOff", v)}
            />
            <ToggleRow
              icon={Globe}
              label="Enable live captions"
              description="Show AI-generated live captions during meetings"
              value={prefs.captionsEnabled}
              onChange={(v) => updatePref("captionsEnabled", v)}
            />
          </div>

          {/* Notifications */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-theme-text-primary mb-2">Notifications</h2>
            <ToggleRow
              icon={Bell}
              label="Participant join alerts"
              description="Show a notification when someone joins your meeting"
              value={prefs.notifyOnJoin}
              onChange={(v) => updatePref("notifyOnJoin", v)}
            />
            <ToggleRow
              icon={Bell}
              label="Chat message alerts"
              description="Show a notification for new chat messages during meetings"
              value={prefs.notifyOnChat}
              onChange={(v) => updatePref("notifyOnChat", v)}
            />
          </div>

          {/* Language */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4" /> Language
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => updatePref("language", lang.code)}
                  className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    prefs.language === lang.code
                      ? "border-theme-text-primary bg-theme-text-primary/10 text-theme-text-primary"
                      : "border-theme-border text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border/70"
                  }`}
                >
                  {lang.label}
                  {prefs.language === lang.code && (
                    <CheckCircle className="w-3.5 h-3.5 text-theme-text-primary" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-theme-text-muted">
              Affects AI captions and real-time translation in meetings
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
