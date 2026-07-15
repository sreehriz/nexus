import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import {
  Video,
  Plus,
  LogIn,
  Clock,
  Users,
  Calendar,
  BarChart2,
  Brain,
  Settings,
  LogOut,
  Copy,
  Check,
  ChevronRight,
  Activity,
  Zap,
  Shield,
  History,
  Bell,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SkeletonDashboard, SkeletonMeeting } from "../components/ui/Skeleton";
import { NoMeetingsEmpty } from "../components/ui/EmptyState";
import CinematicBackground from "../components/CinematicBackground";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

interface MeetingRecord {
  id: string;
  host_id: string;
  created_at: string;
  ended_at: string | null;
  participant_count: number;
  duration_seconds: number;
  is_active: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [theme] = useState<"dark" | "light">(
    () => (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark"
  );

  const userName =
    user?.user_metadata?.fullName ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarColor =
    user?.user_metadata?.avatarColor || "from-indigo-500 to-cyan-400";

  // Meeting history
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);

  // Join meeting state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalDuration: 0,
    avgParticipants: 0,
    activeMeetings: 0,
  });

  const fetchMeetingHistory = useCallback(async () => {
    if (!user) return;
    setMeetingsLoading(true);
    setMeetingsError(null);

    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/meetings/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setStats({
          totalMeetings: data.total || data.meetings?.length || 0,
          totalDuration: data.total_duration || 0,
          avgParticipants: data.avg_participants || 0,
          activeMeetings: data.active_count || 0,
        });
      } else {
        // Backend not available — show empty state gracefully
        setMeetings([]);
      }
    } catch {
      // Backend offline — show empty state, not an error
      setMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMeetingHistory();
  }, [fetchMeetingHistory]);

  const handleStartMeeting = async () => {
    setStarting(true);
    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await fetch(`${BACKEND_URL}/api/createMeeting`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        const roomCode = data.roomCode;

        // Also join as host
        const joinRes = await fetch(`${BACKEND_URL}/api/joinMeeting`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            roomCode,
            displayName: userName,
            userId: user?.id || "",
          }),
        });

        if (joinRes.ok) {
          const joinData = await joinRes.json();
          localStorage.setItem("nexus_room_token", joinData.token);
          localStorage.setItem("nexus_role", joinData.role);
        }

        navigate(`/meeting/${roomCode}`);
      } else {
        throw new Error("Server error");
      }
    } catch {
      // Offline fallback
      const code = "nex-" + Math.floor(100 + Math.random() * 900) + "-" + Math.random().toString(36).slice(2, 5);
      localStorage.setItem("nexus_role", "Organizer");
      toast("Starting offline meeting session", "info");
      navigate(`/meeting/${code}`);
    } finally {
      setStarting(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!joinCode.trim()) {
      setJoinError("Please enter a room code");
      return;
    }
    setJoining(true);
    setJoinError("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/joinMeeting`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          roomCode: joinCode.trim(),
          displayName: userName,
          userId: user?.id || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("nexus_room_token", data.token);
        localStorage.setItem("nexus_role", data.role);
        setShowJoinModal(false);
        navigate(`/meeting/${joinCode.trim()}`);
      } else {
        const err = await res.json();
        setJoinError(err.detail || "Room not found or locked");
      }
    } catch {
      // Offline: just navigate
      localStorage.setItem("nexus_role", "Participant");
      setShowJoinModal(false);
      navigate(`/meeting/${joinCode.trim()}`);
    } finally {
      setJoining(false);
    }
  };

  const copyMeetingCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/meeting/${code}`);
    toast("Meeting link copied to clipboard", "success");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
      <CinematicBackground theme={theme} />

      {/* Sidebar + Main layout */}
      <div className="relative z-10 flex min-h-screen">
        
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-theme-border/20 bg-theme-bg/60 backdrop-blur-xl pt-6 pb-4 px-4 gap-1 sticky top-0 h-screen">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-theme-text-primary flex items-center justify-center">
              <span className="font-panchang font-extrabold text-theme-bg text-xs">N</span>
            </div>
            <span className="font-panchang font-extrabold text-base text-theme-text-primary tracking-wider uppercase">
              Nexus
            </span>
          </div>

          {/* Nav */}
          {[
            { icon: BarChart2, label: "Dashboard", to: "/dashboard", active: true },
            { icon: History, label: "Meeting History", to: "/history" },
            { icon: Brain, label: "Nexus Memory", to: "/memory" },
            { icon: Bell, label: "Notifications", to: "/settings" },
            { icon: Settings, label: "Settings", to: "/settings" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-theme-text-primary/10 text-theme-text-primary"
                  : "text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-text-primary/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="mt-auto flex flex-col gap-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-text-primary/5 transition-all"
            >
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarColor} shrink-0`}
              />
              <span className="truncate">{userName}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-theme-text-muted hover:text-red-400 hover:bg-red-500/5 transition-all text-left w-full"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-6 md:px-8 py-8 max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between mb-8 gap-4"
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-text-muted mb-1">
                Welcome back
              </p>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-theme-text-primary">
                {userName}
              </h1>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-theme-border text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-primary transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Join</span>
              </button>
              <button
                onClick={handleStartMeeting}
                disabled={starting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {starting ? (
                  <div className="w-3.5 h-3.5 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />
                ) : (
                  <Video className="w-3.5 h-3.5" />
                )}
                <span>Start Meeting</span>
              </button>
            </div>
          </motion.div>

          {meetingsLoading ? (
            <SkeletonDashboard />
          ) : (
            <>
              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                {[
                  {
                    icon: Video,
                    label: "Total Meetings",
                    value: meetings.length || stats.totalMeetings || 0,
                    sub: "All time",
                  },
                  {
                    icon: Clock,
                    label: "Time in Meetings",
                    value: formatDuration(stats.totalDuration),
                    sub: "Cumulative",
                  },
                  {
                    icon: Users,
                    label: "Avg Participants",
                    value: stats.avgParticipants > 0 ? stats.avgParticipants.toFixed(1) : "—",
                    sub: "Per meeting",
                  },
                  {
                    icon: Activity,
                    label: "Active Now",
                    value: stats.activeMeetings || 0,
                    sub: "Live sessions",
                    accent: true,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-panel rounded-xl p-5 flex flex-col gap-3 hover:bg-theme-surface/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                        {stat.label}
                      </span>
                      <stat.icon
                        className={`w-4 h-4 ${stat.accent ? "text-emerald-500" : "text-theme-text-muted"}`}
                      />
                    </div>
                    <span
                      className={`text-2xl font-bold font-display ${stat.accent && stats.activeMeetings > 0 ? "text-emerald-400" : "text-theme-text-primary"}`}
                    >
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-theme-text-muted">{stat.sub}</span>
                  </div>
                ))}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
              >
                {[
                  {
                    icon: Video,
                    label: "Start Instant Meeting",
                    desc: "Launch a meeting right now",
                    action: handleStartMeeting,
                    primary: true,
                  },
                  {
                    icon: LogIn,
                    label: "Join a Meeting",
                    desc: "Enter a room code to join",
                    action: () => setShowJoinModal(true),
                  },
                  {
                    icon: Brain,
                    label: "Nexus Memory",
                    desc: "Search your past meetings",
                    action: () => navigate("/memory"),
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className={`flex items-center gap-4 p-5 rounded-xl text-left transition-all group hover:-translate-y-0.5 ${
                      action.primary
                        ? "bg-theme-text-primary text-theme-bg hover:opacity-90"
                        : "glass-panel hover:bg-theme-surface/60"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        action.primary
                          ? "bg-theme-bg/20"
                          : "bg-theme-text-primary/5 border border-theme-border"
                      }`}
                    >
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold">{action.label}</span>
                      <span
                        className={`text-xs ${action.primary ? "text-theme-bg/70" : "text-theme-text-muted"}`}
                      >
                        {action.desc}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform ${
                        action.primary ? "text-theme-bg/60" : "text-theme-text-muted"
                      }`}
                    />
                  </button>
                ))}
              </motion.div>

              {/* Meeting History */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-theme-text-primary">
                    Recent Meetings
                  </h2>
                  <Link
                    to="/history"
                    className="text-[11px] font-mono uppercase tracking-wider text-theme-text-muted hover:text-theme-text-primary transition-colors"
                  >
                    View All →
                  </Link>
                </div>

                {meetings.length === 0 ? (
                  <NoMeetingsEmpty
                    onStart={handleStartMeeting}
                    onJoin={() => setShowJoinModal(true)}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {meetings.slice(0, 8).map((meeting) => (
                      <motion.div
                        key={meeting.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-panel rounded-xl px-5 py-4 flex items-center gap-4 hover:bg-theme-surface/50 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-theme-text-primary/5 border border-theme-border/30 flex items-center justify-center shrink-0">
                          <Video className="w-4 h-4 text-theme-text-muted" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-theme-text-primary font-mono truncate">
                              {meeting.id}
                            </span>
                            {meeting.is_active && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-widest text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-theme-text-muted">
                              {timeAgo(meeting.created_at)}
                            </span>
                            {meeting.duration_seconds > 0 && (
                              <>
                                <span className="text-theme-border">·</span>
                                <span className="text-[11px] text-theme-text-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(meeting.duration_seconds)}
                                </span>
                              </>
                            )}
                            {meeting.participant_count > 0 && (
                              <>
                                <span className="text-theme-border">·</span>
                                <span className="text-[11px] text-theme-text-muted flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {meeting.participant_count}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyMeetingCode(meeting.id)}
                            className="p-2 rounded-lg hover:bg-theme-text-primary/10 text-theme-text-muted hover:text-theme-text-primary transition-all"
                            title="Copy meeting link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {meeting.is_active && (
                            <button
                              onClick={() => navigate(`/meeting/${meeting.id}`)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                            >
                              Rejoin
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </main>
      </div>

      {/* Join Meeting Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-theme-bg/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md p-6 rounded-2xl glass-panel-heavy border border-theme-border shadow-2xl z-10 flex flex-col gap-5"
            >
              <button
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-theme-text-secondary/15 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-theme-text-secondary" />
                  <h3 className="font-display font-semibold text-lg text-theme-text-primary">
                    Join a Meeting
                  </h3>
                </div>
                <p className="text-xs text-theme-text-secondary leading-relaxed">
                  Enter the room code shared by the host
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                    placeholder="e.g. nex-794-slv"
                    autoFocus
                    className="bg-theme-secondary/40 border border-theme-border focus:border-theme-text-primary rounded-xl px-3.5 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors font-mono"
                  />
                </div>

                {joinError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-text-secondary border border-theme-border hover:border-theme-text-primary rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinMeeting}
                    disabled={joining}
                    className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary hover:opacity-90 rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                  >
                    {joining ? (
                      <div className="w-3.5 h-3.5 border border-theme-bg/40 border-t-theme-bg rounded-full animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Join</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
