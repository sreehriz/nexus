import React from "react";
import { Play, Send, Brain, CheckSquare, FileText, Download } from "lucide-react";
import { ActionItem, Decision, Participant } from "./types";

interface PostMeetingScreenProps {
  roomCode: string;
  userName: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  participants: Participant[];
  analyticsSummary: {
    duration: string;
    totalMembers: number;
    averagePing: string;
    encryption: string;
    moodBreakdown: { focused: number; excited: number; silent: number };
    healthScore: number;
  };
  onReturnToLobby: () => void;
}

export default function PostMeetingScreen({
  roomCode,
  userName,
  actionItems,
  decisions,
  participants,
  analyticsSummary,
  onReturnToLobby,
}: PostMeetingScreenProps) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-10 glass-panel-heavy rounded-2xl border border-theme-glass-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in text-left">
      {/* Post-Meeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-theme-border/20 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-text-primary flex items-center justify-center">
            <span className="font-panchang font-extrabold text-theme-bg text-sm">N</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-semibold text-theme-text-primary tracking-tight">
              Global Edge Routing Negotiation
            </h1>
            <p className="text-xs text-theme-text-muted mt-1">
              Meeting ended on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToLobby}
            className="px-5 py-3 glass-pill text-xs font-semibold uppercase tracking-wider text-theme-text-primary hover:bg-theme-text-primary/10 rounded-xl transition-all cursor-pointer border border-theme-border"
          >
            Return to Lobby
          </button>
          <button
            onClick={() => alert("Summary archive linked to workspace repository.")}
            className="px-5 py-3 bg-theme-text-primary text-theme-bg text-xs font-semibold uppercase tracking-wider rounded-xl hover:opacity-90 shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Share Summary</span>
          </button>
        </div>
      </div>

      {/* Post-Meeting Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center - Video playback and summaries */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Playback Container */}
          <div className="relative rounded-2xl border border-theme-border/20 bg-theme-surface/75 aspect-video overflow-hidden shadow-inner group">
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <button className="w-16 h-16 rounded-full bg-theme-text-primary/15 hover:bg-theme-text-primary/25 border border-theme-border flex items-center justify-center transition-all cursor-pointer group-hover:scale-105">
                <Play className="w-6 h-6 text-theme-text-primary fill-theme-text-primary ml-1" />
              </button>
            </div>

            {/* Fake timeline indicator */}
            <div className="absolute bottom-4 left-4 right-4 bg-theme-bg/85 backdrop-blur-md border border-theme-border/30 rounded-xl p-3.5 flex items-center gap-4">
              <span className="text-[10px] font-mono text-theme-text-secondary select-none">12:40</span>
              <div className="flex-1 h-1 bg-theme-border/20 rounded-full relative">
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-theme-text-primary rounded-full" />
                <div className="absolute left-1/3 -top-1 w-3 h-3 bg-theme-text-primary border border-theme-bg rounded-full cursor-pointer" />
                
                {/* Timeline markers */}
                <span className="absolute left-[15%] -top-1.5 w-1.5 h-4 bg-amber-400/80 rounded" title="Decision reached" />
                <span className="absolute left-[45%] -top-1.5 w-1.5 h-4 bg-cyan-400/80 rounded" title="MOM Highlight" />
                <span className="absolute left-[70%] -top-1.5 w-1.5 h-4 bg-pink-400/80 rounded" title="Question flagged" />
              </div>
              <span className="text-[10px] font-mono text-theme-text-muted select-none">46:12</span>
            </div>
          </div>

          {/* AI Summary and MOM Report */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border-transparent">
            <div className="flex items-center gap-2 text-theme-text-primary">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h3 className="font-display font-semibold text-sm tracking-wider uppercase">
                AI Transcript Summary & Decisions
              </h3>
            </div>

            <div className="text-xs text-theme-text-secondary leading-relaxed space-y-4 font-sans font-light">
              <p>
                <strong>Summary of last 10 minutes:</strong> Discussions centered on confirming edge signaling pipelines using custom router clusters. Network latencies averaged <span className="font-mono text-theme-text-primary font-bold">16ms</span> with zero telemetry dropouts during peak loads.
              </p>
              
              <div className="h-px bg-theme-border/25 my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Action items */}
                <div>
                  <h4 className="font-semibold text-theme-text-primary mb-3 text-[11px] font-mono uppercase tracking-wider">
                    Detected Action Items ({actionItems.length})
                  </h4>
                  <ul className="space-y-3">
                    {actionItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2.5 text-left">
                        <CheckSquare className={`w-4 h-4 shrink-0 mt-0.5 ${item.done ? 'text-emerald-500' : 'text-theme-text-muted/60'}`} />
                        <div>
                          <p className={`leading-normal ${item.done ? 'line-through text-theme-text-muted/50' : 'text-theme-text-secondary'}`}>
                            {item.text}
                          </p>
                          <span className="text-[9px] font-mono text-theme-text-muted uppercase tracking-wider block mt-0.5">
                            Assignee: {item.assignee}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Decisions */}
                <div>
                  <h4 className="font-semibold text-theme-text-primary mb-3 text-[11px] font-mono uppercase tracking-wider">
                    Key Decisions Resolved ({decisions.length})
                  </h4>
                  <ul className="space-y-3">
                    {decisions.map((dec) => (
                      <li key={dec.id} className="flex gap-2 text-theme-text-secondary leading-normal text-left">
                        <span className="text-emerald-500 font-bold mt-0.5">•</span>
                        <div>
                          <p>{dec.text}</p>
                          <span className="text-[9px] font-mono text-theme-text-muted block mt-0.5">
                            Logged at {dec.timestamp}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics, Transcripts and Attendees */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Meeting Health Score */}
          <div className="glass-panel p-5 rounded-2xl border-transparent flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-theme-border/25 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-theme-text-muted">
                Meeting Analytics
              </span>
              <span className="text-xs font-mono text-emerald-500 font-bold">
                Health Index: {analyticsSummary.healthScore}%
              </span>
            </div>

            {/* Metric stats */}
            <div className="flex flex-col gap-3.5">
              {[
                { label: "Aggregate Engagement", val: "92%" },
                { label: "Participation Balance", val: "Balanced (88%)" },
                { label: "Telemetry Stream Quality", val: "96% (A+ Level)" },
                { label: "Average Edge Latency", val: analyticsSummary.averagePing }
              ].map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-theme-text-secondary font-light">{stat.label}</span>
                  <span className="font-mono text-theme-text-primary font-bold">{stat.val}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-theme-border/25 my-1" />

            {/* Mood breakdown */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted mb-1">
                Mood Breakdown Indicator
              </span>
              <div className="h-2 rounded-full overflow-hidden bg-theme-border/20 flex">
                <div className="h-full bg-cyan-400" style={{ width: `${analyticsSummary.moodBreakdown.focused}%` }} title="Focused" />
                <div className="h-full bg-amber-400" style={{ width: `${analyticsSummary.moodBreakdown.excited}%` }} title="Excited" />
                <div className="h-full bg-theme-text-muted/40" style={{ width: `${analyticsSummary.moodBreakdown.silent}%` }} title="Silent" />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-theme-text-muted mt-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> Focused ({analyticsSummary.moodBreakdown.focused}%)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Excited ({analyticsSummary.moodBreakdown.excited}%)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-theme-text-muted/40 rounded-full" /> Silent ({analyticsSummary.moodBreakdown.silent}%)</span>
              </div>
            </div>
          </div>

          {/* Attendance & Log List */}
          <div className="glass-panel p-5 rounded-2xl border-transparent flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-theme-text-muted">
                Attendance List ({analyticsSummary.totalMembers})
              </span>
              <button
                onClick={() => alert("Attendance sheet downloaded as CSV.")}
                className="p-1 rounded hover:bg-theme-text-primary/5 text-theme-text-secondary hover:text-theme-text-primary cursor-pointer"
                title="Download Attendance File"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-[9px] font-bold text-black`}>
                      {p.name.charAt(0)}
                    </div>
                    <span className="text-theme-text-secondary truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-theme-text-muted uppercase bg-theme-border/20 px-1.5 py-0.5 rounded">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Download PDF Reports */}
          <button
            onClick={() => alert("Minutes of meeting exported as structured Markdown document.")}
            className="w-full py-3.5 glass-pill text-xs font-semibold uppercase tracking-wider text-theme-text-primary hover:bg-theme-text-primary/5 border border-theme-border rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export Minutes of Meeting</span>
          </button>
        </div>
      </div>
    </div>
  );
}
