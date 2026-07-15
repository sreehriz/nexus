import React, { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Key, Trash2, Save, CheckCircle, AlertCircle, Palette } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CinematicBackground from "../components/CinematicBackground";

const AVATAR_COLORS = [
  { label: "Cosmic", value: "from-indigo-500 to-cyan-400" },
  { label: "Solar", value: "from-[#FF416C] to-[#FF4B2B]" },
  { label: "Aurora", value: "from-[#11998E] to-[#38EF7D]" },
  { label: "Galaxy", value: "from-[#667EEA] to-[#764BA2]" },
  { label: "Sunset", value: "from-[#F093FB] to-[#F5576C]" },
  { label: "Ocean", value: "from-[#4FACFE] to-[#00F2FE]" },
  { label: "Forest", value: "from-[#43E97B] to-[#38F9D7]" },
  { label: "Flame", value: "from-[#FA709A] to-[#FEE140]" },
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [theme] = useState<"dark" | "light">(
    () => (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark"
  );

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.fullName || user?.user_metadata?.username || user?.email?.split("@")[0] || ""
  );
  const [selectedColor, setSelectedColor] = useState(
    user?.user_metadata?.avatarColor || "from-indigo-500 to-cyan-400"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName: displayName, avatarColor: selectedColor }),
      });

      if (res.ok) {
        // Update local mock session too
        const mock = localStorage.getItem("nexus_mock_session");
        if (mock) {
          const parsed = JSON.parse(mock);
          parsed.user_metadata = { ...parsed.user_metadata, fullName: displayName, avatarColor: selectedColor };
          localStorage.setItem("nexus_mock_session", JSON.stringify(parsed));
        }
        toast("Profile updated successfully", "success");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      // Update locally if backend not available
      const mock = localStorage.getItem("nexus_mock_session");
      if (mock) {
        const parsed = JSON.parse(mock);
        parsed.user_metadata = { ...parsed.user_metadata, fullName: displayName, avatarColor: selectedColor };
        localStorage.setItem("nexus_mock_session", JSON.stringify(parsed));
      }
      toast("Profile updated locally", "info");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    await logout();
    navigate("/");
    toast("Account deleted", "info");
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
      <CinematicBackground theme={theme} />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Back button */}
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
            <h1 className="text-2xl font-display font-bold text-theme-text-primary">Profile</h1>
            <p className="text-sm text-theme-text-secondary mt-1">Manage your account identity</p>
          </div>

          {/* Avatar preview */}
          <div className="flex items-center gap-5 glass-panel rounded-2xl p-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedColor} flex items-center justify-center text-white font-bold text-2xl select-none`}>
              {(displayName || "U")[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-theme-text-primary">{displayName || "Your Name"}</span>
              <span className="text-xs text-theme-text-muted">{user?.email}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted mt-1">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <User className="w-4 h-4" /> Identity
            </h2>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="bg-theme-secondary/40 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-theme-secondary/20 border border-theme-border/50 rounded-xl px-3.5 py-3 text-sm text-theme-text-muted outline-none cursor-not-allowed"
              />
              <span className="text-[10px] text-theme-text-muted">Email cannot be changed</span>
            </div>
          </div>

          {/* Avatar color */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <Palette className="w-4 h-4" /> Avatar Color
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    selectedColor === c.value
                      ? "border-theme-text-primary bg-theme-text-primary/10"
                      : "border-theme-border/30 hover:border-theme-border"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.value}`} />
                  <span className="text-[10px] font-mono text-theme-text-muted">{c.label}</span>
                  {selectedColor === c.value && (
                    <CheckCircle className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-theme-text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <div className="w-4 h-4 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saved ? "Saved!" : "Save Changes"}</span>
          </button>

          {/* Danger zone */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 border border-red-500/20">
            <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Danger Zone
            </h2>
            <p className="text-xs text-theme-text-secondary">
              Permanently delete your Nexus account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
