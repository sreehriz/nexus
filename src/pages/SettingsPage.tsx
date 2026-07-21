import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Moon, Sun, Bell, Globe, CheckCircle,
  VideoOff, MicOff, Loader2, CloudUpload, WifiOff,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import CinematicBackground from "../components/CinematicBackground";
import { apiFetch } from "@/src/config";


type Preference = {
  autoMute: boolean;
  autoVideoOff: boolean;
  notifyOnJoin: boolean;
  notifyOnChat: boolean;
  captionsEnabled: boolean;
  language: string;
};

const DEFAULT_PREFS: Preference = {
  autoMute: false,
  autoVideoOff: false,
  notifyOnJoin: true,
  notifyOnChat: true,
  captionsEnabled: false,
  language: "en",
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
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ElementType;
  disabled?: boolean;
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
        onClick={() => !disabled && onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          disabled ? "opacity-50 cursor-not-allowed" :
          value ? "bg-theme-text-primary" : "bg-theme-border"
        }`}
        role="switch"
        aria-checked={value}
        disabled={disabled}
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
  const { user } = useAuth();

  const getStoredTheme = () =>
    (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark";

  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme());
  const [prefs, setPrefs] = useState<Preference>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  // Pending changes for auto-save debouncing
  const [pendingUpdate, setPendingUpdate] = useState<Partial<Record<string, any>>>({});
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ── Load settings from backend on mount ───────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) { setLoading(false); return; }
      const token = localStorage.getItem("nexus_jwt");
      if (!token) { setLoading(false); return; }

      try {
        const res = await apiFetch("/user/settings", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPrefs({
            autoMute: data.auto_mute ?? false,
            autoVideoOff: data.auto_video_off ?? false,
            notifyOnJoin: data.notify_on_join ?? true,
            notifyOnChat: data.notify_on_chat ?? true,
            captionsEnabled: data.captions_enabled ?? false,
            language: data.language ?? "en",
          });
          // Sync theme from backend if stored there
          if (data.theme && data.theme !== theme) {
            setTheme(data.theme as "dark" | "light");
            localStorage.setItem("nexus-theme", data.theme);
            document.documentElement.classList.toggle("dark", data.theme === "dark");
            document.documentElement.classList.toggle("light", data.theme === "light");
          }
        } else {
          // Fall back to localStorage cache
          const cached = localStorage.getItem("nexus_prefs");
          if (cached) setPrefs(JSON.parse(cached));
        }
      } catch {
        setOffline(true);
        // Fall back to localStorage cache
        try {
          const cached = localStorage.getItem("nexus_prefs");
          if (cached) setPrefs(JSON.parse(cached));
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Auto-save with debounce: backend patch ────────────────────────────────
  const flushSave = useCallback(
    async (patch: Record<string, any>) => {
      const token = localStorage.getItem("nexus_jwt");
      if (!token || Object.keys(patch).length === 0) return;

      setSaving(true);
      try {
        const res = await apiFetch("/user/settings", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          setOffline(false);
          toast("Settings saved ✓", "success", 1500);
        } else {
          toast("Failed to save — please retry", "error", 2500);
        }
      } catch {
        setOffline(true);
        toast("Offline — settings saved locally", "info", 2500);
      } finally {
        setSaving(false);
        setPendingUpdate({});
      }
    },
    [toast]
  );

  const scheduleSave = (patch: Record<string, any>) => {
    setPendingUpdate((prev) => ({ ...prev, ...patch }));
    if (saveTimer) clearTimeout(saveTimer);
    const id = setTimeout(() => {
      flushSave({ ...pendingUpdate, ...patch });
    }, 1000); // 1-second debounce
    setSaveTimer(id);
  };

  // ── Update a preference ───────────────────────────────────────────────────
  const updatePref = (key: keyof Preference, value: boolean | string) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    // Cache locally first
    localStorage.setItem("nexus_prefs", JSON.stringify(next));

    // Map frontend key → backend snake_case key
    const backendKeyMap: Record<string, string> = {
      autoMute: "auto_mute",
      autoVideoOff: "auto_video_off",
      notifyOnJoin: "notify_on_join",
      notifyOnChat: "notify_on_chat",
      captionsEnabled: "captions_enabled",
      language: "language",
    };
    const backendKey = backendKeyMap[key];
    if (backendKey) scheduleSave({ [backendKey]: value });
  };

  // ── Toggle theme ──────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("nexus-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
    scheduleSave({ theme: next });
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-theme-text-primary">Settings</h1>
              <p className="text-sm text-theme-text-secondary mt-1">Customize your Nexus experience</p>
            </div>
            {/* Save status indicator */}
            <div className="flex items-center gap-2 mt-1">
              {loading && <Loader2 className="w-4 h-4 animate-spin text-theme-text-muted" />}
              {saving && !loading && (
                <span className="flex items-center gap-1.5 text-xs text-theme-text-muted">
                  <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
                  Saving…
                </span>
              )}
              {offline && !saving && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  Offline
                </span>
              )}
            </div>
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
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-border text-xs font-semibold text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-primary transition-all disabled:opacity-50"
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
              disabled={loading}
            />
            <ToggleRow
              icon={VideoOff}
              label="Join with camera off"
              description="Automatically disable your camera when joining any meeting"
              value={prefs.autoVideoOff}
              onChange={(v) => updatePref("autoVideoOff", v)}
              disabled={loading}
            />
            <ToggleRow
              icon={Globe}
              label="Enable live captions"
              description="Show AI-generated live captions during meetings"
              value={prefs.captionsEnabled}
              onChange={(v) => updatePref("captionsEnabled", v)}
              disabled={loading}
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
              disabled={loading}
            />
            <ToggleRow
              icon={Bell}
              label="Chat message alerts"
              description="Show a notification for new chat messages during meetings"
              value={prefs.notifyOnChat}
              onChange={(v) => updatePref("notifyOnChat", v)}
              disabled={loading}
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
                  onClick={() => !loading && updatePref("language", lang.code)}
                  disabled={loading}
                  className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-50 ${
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

          {/* Save status footer */}
          {offline && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              You're offline. Settings are cached locally and will sync when reconnected.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
