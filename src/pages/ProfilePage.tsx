import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Key, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Palette, 
  Lock, 
  Eye, 
  EyeOff, 
  Link2, 
  Link2Off,
  Github
} from "lucide-react";
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

  // Identity Form State
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState("from-indigo-500 to-cyan-400");
  const [provider, setProvider] = useState("local");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password Override Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // Fetch full profile info on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("nexus_jwt");
        const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.fullName || "");
          setSelectedColor(data.avatarColor || "from-indigo-500 to-cyan-400");
          setProvider(data.provider || "local");
        }
      } catch (err) {
        console.error("Failed to load backend profile, falling back to local storage session.", err);
        setDisplayName(user?.user_metadata?.fullName || user?.user_metadata?.username || user?.email?.split("@")[0] || "");
        setSelectedColor(user?.user_metadata?.avatarColor || "from-indigo-500 to-cyan-400");
      }
    };
    fetchProfile();
  }, [user]);

  // Compute password strength coefficient
  useEffect(() => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;
    setPwStrength(score);
  }, [newPassword]);

  const handleSaveIdentity = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fullName: displayName, avatarColor: selectedColor }),
        credentials: "include",
      });

      if (res.ok) {
        // Update local session
        const mock = localStorage.getItem("nexus_mock_session");
        if (mock) {
          const parsed = JSON.parse(mock);
          parsed.user_metadata = { ...parsed.user_metadata, fullName: displayName, avatarColor: selectedColor };
          localStorage.setItem("nexus_mock_session", JSON.stringify(parsed));
        }
        toast("Profile credentials updated.", "success");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error("Failed to save profile parameters.");
      }
    } catch {
      toast("Failed to modify profile identity.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwStrength < 5) {
      setPwError("Password is not complex enough.");
      return;
    }

    setPwSaving(true);
    setPwError("");

    try {
      const token = localStorage.getItem("nexus_jwt");
      const formData = new FormData();
      formData.append("currentPassword", currentPassword);
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmPassword);

      const res = await fetch(`${BACKEND_URL}/api/user/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      setPwSaving(false);

      if (res.ok) {
        toast("Access credentials changed successfully.", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwError(data.detail || "Verification of current password failed.");
      }
    } catch {
      setPwSaving(false);
      setPwError("Cannot connect to authorization node.");
    }
  };

  const handleDisconnectOAuth = async (target: "google" | "github") => {
    if (!window.confirm(`Are you sure you want to disconnect ${target.toUpperCase()}?`)) return;
    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/auth/disconnect/${target}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
      });
      if (res.ok) {
        toast(`Disconnected ${target.toUpperCase()} successfully.`, "success");
        setProvider("local");
      } else {
        const d = await res.json();
        toast(d.detail || `Failed to disconnect ${target}.`, "error");
      }
    } catch {
      toast("Network connection error.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("CRITICAL WARNING: This will immediately delete your account and invalidate all meetings, documents, and credentials. Are you sure you wish to proceed?")) return;
    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/user/delete-account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
      });
      if (res.ok) {
        await logout();
        navigate("/");
        toast("Nexus account has been deleted.", "info");
      } else {
        toast("Deletion request rejected by security engine.", "error");
      }
    } catch {
      toast("Failed to connect to backend server.", "error");
    }
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
      <CinematicBackground theme={theme} />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-theme-text-muted hover:text-theme-text-primary transition-colors mb-8 outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div className="text-left">
            <h1 className="text-2xl font-display font-bold text-theme-text-primary">Profile Configuration</h1>
            <p className="text-sm text-theme-text-secondary mt-1">Manage credentials, security parameters, and identity</p>
          </div>

          {/* User info header block */}
          <div className="flex items-center gap-5 glass-panel rounded-2xl p-6 text-left">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedColor} flex items-center justify-center text-white font-bold text-2xl select-none shadow-md shrink-0`}>
              {(displayName || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-base font-semibold text-theme-text-primary truncate">{displayName || "Operator"}</span>
              <span className="text-xs text-theme-text-muted truncate">{user?.email}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted mt-1">
                Connected via {provider.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Identity Parameters Box */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 text-left">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <User className="w-4 h-4" /> Identity Parameters
            </h2>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Name"
                className="bg-theme-secondary/40 border border-theme-border/50 focus:border-theme-text-primary/60 rounded-xl px-3.5 py-3 text-sm text-theme-text-primary outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Core Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-theme-secondary/20 border border-theme-border/30 rounded-xl px-3.5 py-3 text-sm text-theme-text-muted outline-none cursor-not-allowed"
              />
              <span className="text-[10px] text-theme-text-muted/75">Email address cannot be manually altered.</span>
            </div>

            <button
              onClick={handleSaveIdentity}
              disabled={saving}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer self-start"
            >
              {saving ? (
                <div className="w-4 h-4 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saved ? "Saved Identity" : "Save Parameters"}</span>
            </button>
          </div>

          {/* Customize Avatar Color Gradient */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 text-left">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <Palette className="w-4 h-4" /> Identity Color Signature
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedColor === c.value
                      ? "border-theme-text-primary bg-theme-text-primary/10"
                      : "border-theme-border/30 hover:border-theme-border/60"
                  }`}
                >
                  <div className={`w-full h-8 rounded-lg bg-gradient-to-br ${c.value} shadow-sm`} />
                  <span className="text-[10px] font-mono text-theme-text-muted">{c.label}</span>
                  {selectedColor === c.value && (
                    <CheckCircle className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-theme-text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Social Provider OAuth Integration */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 text-left">
            <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
              <Link2 className="w-4 h-4" /> OAuth Sign-in Handshakes
            </h2>
            <p className="text-xs text-theme-text-secondary leading-relaxed">
              Integrate Google or GitHub credentials with your Nexus profile for single-click dashboard access.
            </p>

            <div className="flex flex-col gap-3">
              {/* Google */}
              <div className="flex items-center justify-between p-4 bg-theme-secondary/25 border border-theme-border/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-theme-border flex items-center justify-center text-red-400">
                    <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.186 4.114-3.578 0-6.48-2.903-6.48-6.48s2.902-6.48 6.48-6.48c1.556 0 2.973.548 4.09 1.458l3.056-3.057C19.232 2.378 15.938 1 12.24 1 5.674 1 0 6.673 0 13.24s5.674 12.24 12.24 12.24c6.905 0 12.24-4.83 12.24-12.24 0-.583-.065-1.127-.175-1.954H12.24z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-theme-text-primary">Google Integration</span>
                    <span className="text-[10px] text-theme-text-muted">
                      {provider === "google" ? "Connected as Primary Account" : "Disconnected"}
                    </span>
                  </div>
                </div>
                {provider === "google" ? (
                  <button
                    onClick={() => handleDisconnectOAuth("google")}
                    className="px-3.5 py-1.5 rounded-lg border border-theme-border/60 hover:bg-red-500/10 text-red-400 font-mono text-[10px] uppercase font-bold outline-none cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    href={`${BACKEND_URL}/api/auth/google`}
                    className="px-3.5 py-1.5 rounded-lg bg-theme-text-primary text-theme-bg font-mono text-[10px] uppercase font-bold hover:opacity-90 outline-none"
                  >
                    Connect
                  </a>
                )}
              </div>

              {/* GitHub */}
              <div className="flex items-center justify-between p-4 bg-theme-secondary/25 border border-theme-border/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-theme-border flex items-center justify-center text-theme-text-primary">
                    <Github className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-theme-text-primary">GitHub Integration</span>
                    <span className="text-[10px] text-theme-text-muted">
                      {provider === "github" ? "Connected as Primary Account" : "Disconnected"}
                    </span>
                  </div>
                </div>
                {provider === "github" ? (
                  <button
                    onClick={() => handleDisconnectOAuth("github")}
                    className="px-3.5 py-1.5 rounded-lg border border-theme-border/60 hover:bg-red-500/10 text-red-400 font-mono text-[10px] uppercase font-bold outline-none cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <a
                    href={`${BACKEND_URL}/api/auth/github`}
                    className="px-3.5 py-1.5 rounded-lg bg-theme-text-primary text-theme-bg font-mono text-[10px] uppercase font-bold hover:opacity-90 outline-none"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Change Password Block */}
          {provider === "local" && (
            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 text-left">
              <h2 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2">
                <Key className="w-4 h-4" /> Credentials Configuration
              </h2>

              {pwError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pwError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="bg-theme-secondary/40 border border-theme-border/50 focus:border-theme-text-primary/60 rounded-xl px-3.5 py-3 text-sm text-theme-text-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Create a complex password"
                      className="w-full bg-theme-secondary/40 border border-theme-border/50 focus:border-theme-text-primary/60 rounded-xl pl-3.5 pr-11 py-3 text-sm text-theme-text-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 text-theme-text-muted hover:text-theme-text-primary cursor-pointer"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="bg-theme-secondary/40 border border-theme-border/50 focus:border-theme-text-primary/60 rounded-xl px-3.5 py-3 text-sm text-theme-text-primary outline-none"
                  />
                </div>

                {/* Password Strength meter */}
                <div className="flex flex-col gap-2 p-3 bg-theme-secondary/15 rounded-xl border border-theme-border/20 text-xs text-theme-text-secondary leading-relaxed">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-theme-text-muted">Security Coefficient:</span>
                    <span className="font-bold text-[10px] uppercase font-mono">
                      {pwStrength <= 2 ? "Weak" : pwStrength <= 4 ? "Medium" : "Strong / Secure"}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-theme-secondary/30 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pwStrength <= 2 ? "bg-red-500" : pwStrength <= 4 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${(pwStrength / 5) * 100}%` }}
                    />
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] text-theme-text-muted list-none pl-0 mt-1 select-none">
                    <li className={newPassword.length >= 8 ? "text-emerald-400 font-bold" : ""}>✓ 8+ Characters</li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-emerald-400 font-bold" : ""}>✓ Uppercase</li>
                    <li className={/[a-z]/.test(newPassword) ? "text-emerald-400 font-bold" : ""}>✓ Lowercase</li>
                    <li className={/[0-9]/.test(newPassword) ? "text-emerald-400 font-bold" : ""}>✓ Number</li>
                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-emerald-400 font-bold" : ""}>✓ Special Character</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={pwSaving}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer self-start"
                >
                  {pwSaving && <div className="w-4 h-4 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />}
                  <span>Change Password</span>
                </button>
              </form>
            </div>
          )}

          {/* Danger zone */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 border border-red-500/20 text-left">
            <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Danger Zone
            </h2>
            <p className="text-xs text-theme-text-secondary leading-relaxed">
              Permanently purge your account, dashboard settings, meetings, whiteboard canvas files, and security overrides from the Nexus grid.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all cursor-pointer outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Nexus Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
