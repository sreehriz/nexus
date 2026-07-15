import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Clock, Users, Copy, ExternalLink, Search, Filter } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SkeletonMeeting } from "../components/ui/Skeleton";
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [theme] = useState<"dark" | "light">(
    () => (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark"
  );

  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch_history = async () => {
      try {
        const token = localStorage.getItem("nexus_jwt");
        const res = await fetch(`${BACKEND_URL}/api/meetings/history?limit=50`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.meetings || []);
        }
      } catch {
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };
    fetch_history();
  }, [user]);

  const filtered = meetings.filter((m) =>
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/meeting/${id}`);
    toast("Meeting link copied", "success");
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary">
      <CinematicBackground theme={theme} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-theme-text-primary">
                Meeting History
              </h1>
              <p className="text-sm text-theme-text-secondary mt-1">
                All your past Nexus sessions
              </p>
            </div>
            <span className="text-xs font-mono text-theme-text-muted bg-theme-secondary/40 border border-theme-border/30 px-3 py-1.5 rounded-full">
              {meetings.length} sessions
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by room code..."
              className="w-full bg-theme-secondary/40 border border-theme-border focus:border-theme-text-primary rounded-xl pl-10 pr-4 py-3 text-sm text-theme-text-primary placeholder-theme-text-secondary/50 outline-none transition-colors font-mono"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => <SkeletonMeeting key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <NoMeetingsEmpty onStart={() => navigate("/dashboard")} />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((meeting, i) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-panel rounded-xl px-5 py-4 flex items-center gap-4 group hover:bg-theme-surface/50 transition-all"
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
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-[11px] text-theme-text-muted">
                        {formatDate(meeting.created_at)}
                      </span>
                      {meeting.duration_seconds > 0 && (
                        <span className="text-[11px] text-theme-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(meeting.duration_seconds)}
                        </span>
                      )}
                      {meeting.participant_count > 0 && (
                        <span className="text-[11px] text-theme-text-muted flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {meeting.participant_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => copyLink(meeting.id)}
                      title="Copy link"
                      className="p-2 rounded-lg hover:bg-theme-text-primary/10 text-theme-text-muted hover:text-theme-text-primary transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {meeting.is_active && (
                      <button
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Rejoin
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
