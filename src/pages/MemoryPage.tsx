import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  Search,
  Sparkles,
  Clock,
  Video,
  MessageSquare,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NoMemoryResultsEmpty } from "../components/ui/EmptyState";
import CinematicBackground from "../components/CinematicBackground";
import { apiFetch } from "@/src/config";


interface MemoryResult {
  meeting_id: string;
  timestamp: string;
  content: string;
  speaker: string;
  relevance: number;
}

const EXAMPLE_QUERIES = [
  "What did we decide about the auth system?",
  "When was the next sprint date mentioned?",
  "Who was assigned the backend task?",
  "Summarize the product roadmap discussion",
];

export default function MemoryPage() {
  const { user } = useAuth();

  const [theme] = useState<"dark" | "light">(
    () => (localStorage.getItem("nexus-theme") as "dark" | "light") || "dark"
  );

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary(null);
    setSearched(true);

    try {
      const token = localStorage.getItem("nexus_jwt");
      const res = await apiFetch("/memory/search", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ query: query.trim(), userId: user?.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSummary(data.summary || null);
      } else {
        const err = await res.json();
        setError(err.detail || "Search failed");
      }
    } catch {
      setError("Nexus Memory is unavailable. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleExample = (q: string) => {
    setQuery(q);
    setTimeout(() => handleSearch(), 100);
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
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
          className="flex flex-col gap-8"
        >
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl glass-panel border border-theme-border/30 flex items-center justify-center">
              <Brain className="w-7 h-7 text-theme-text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-theme-text-primary">
                Nexus Memory™
              </h1>
              <p className="text-sm text-theme-text-secondary mt-2 max-w-md">
                Ask your meetings anything. Every conversation you've had is searchable through natural language.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask your meetings anything..."
                className="w-full bg-theme-secondary/40 border border-theme-border focus:border-theme-text-primary rounded-2xl pl-11 pr-32 py-4 text-sm text-theme-text-primary placeholder-theme-text-secondary/40 outline-none transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>

            {/* Example queries */}
            {!searched && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExample(q)}
                    className="text-[11px] font-mono text-theme-text-muted border border-theme-border/40 rounded-full px-3 py-1.5 hover:text-theme-text-primary hover:border-theme-text-primary transition-all"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-12"
              >
                <Loader2 className="w-8 h-8 text-theme-text-muted animate-spin" />
                <p className="text-xs font-mono uppercase tracking-widest text-theme-text-muted">
                  Searching memory...
                </p>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30"
              >
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-red-300">Search failed</span>
                  <span className="text-xs text-red-400/70">{error}</span>
                </div>
              </motion.div>
            )}

            {!loading && searched && !error && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
              >
                {/* AI Summary */}
                {summary && (
                  <div className="glass-panel rounded-2xl p-5 border border-theme-border/30 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-theme-text-muted" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                        AI Summary
                      </span>
                    </div>
                    <p className="text-sm text-theme-text-secondary leading-relaxed">{summary}</p>
                  </div>
                )}

                {results.length === 0 ? (
                  <NoMemoryResultsEmpty query={query} />
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                      {results.length} result{results.length !== 1 ? "s" : ""} found
                    </span>
                    {results.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-panel rounded-xl p-5 flex flex-col gap-3 hover:bg-theme-surface/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                            <span className="text-[11px] font-mono text-theme-text-muted">
                              {result.meeting_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-theme-text-muted">
                            <Clock className="w-3 h-3" />
                            {new Date(result.timestamp).toLocaleString("en-US", {
                              month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                            })}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-3.5 h-3.5 text-theme-text-muted shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
                              {result.speaker}
                            </span>
                            <p className="text-sm text-theme-text-primary leading-relaxed">
                              {result.content}
                            </p>
                          </div>
                        </div>

                        {result.relevance > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-theme-border/20">
                              <div
                                className="h-full rounded-full bg-theme-text-primary/40"
                                style={{ width: `${Math.round(result.relevance * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-theme-text-muted shrink-0">
                              {Math.round(result.relevance * 100)}% match
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
