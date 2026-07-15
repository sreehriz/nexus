import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, Activity, Sliders, Plus, Minus, Languages } from "lucide-react";
import { Participant } from "./types";

interface MeetingHeaderProps {
  roomCode: string;
  userName: string;
  recState: "recording" | "paused" | "idle";
  recTime: number;
  latency: number;
  mood: string;
  showSimPanel: boolean;
  onToggleSimPanel: () => void;
  onToggleRecording: () => void;
  onAddMockParticipant: () => void;
  onRemoveMockParticipant: () => void;
  onSimulateGesture: (gesture: string) => void;
  onSimulateVoiceCommand: (cmd: string) => void;
  participants: Participant[];
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MeetingHeader({
  roomCode,
  userName,
  recState,
  recTime,
  latency,
  mood,
  showSimPanel,
  onToggleSimPanel,
  onToggleRecording,
  onAddMockParticipant,
  onRemoveMockParticipant,
  onSimulateGesture,
  onSimulateVoiceCommand,
  participants,
}: MeetingHeaderProps) {
  const isOrganizer = participants.find((p) => p.id === "you")?.role === "Organizer";
  const isRecording = recState === "recording";

  return (
    <>
      {/* Top Header Navigation */}
      <div className="px-5 py-3 border-b border-theme-border/30 flex items-center justify-between bg-theme-bg/25">
        {/* Left Section: Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-theme-text-primary flex items-center justify-center shadow-lg">
            <span className="font-panchang font-extrabold text-theme-bg text-[11px] select-none">N</span>
          </div>
          <div className="h-4 w-px bg-theme-border/30" />
          <div className="flex flex-col">
            <span className="text-[11px] font-display font-semibold tracking-wider text-theme-text-primary uppercase leading-none">
              Global Edge Negotiation
            </span>
            <span className="text-[8px] font-mono text-theme-text-muted tracking-widest uppercase mt-0.5">
              Secure Nexus Matrix
            </span>
          </div>
        </div>

        {/* Center Section: Recording Status & Active Speaker Indicator */}
        <div className="flex items-center gap-3">
          {(isRecording || isOrganizer) && (
            <button
              onClick={onToggleRecording}
              className={`flex items-center gap-2 px-2.5 py-1 rounded border outline-none select-none ${
                recState === "recording"
                  ? "bg-red-950/20 border-red-900/35 text-red-500 dark:text-red-300 animate-pulse cursor-pointer"
                  : "bg-theme-border/20 border-theme-border/30 text-theme-text-muted hover:text-theme-text-primary cursor-pointer"
              }`}
              title={isOrganizer ? "Toggle Session Recording" : "Recording status indicator"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${recState === "recording" ? "bg-red-500" : "bg-zinc-500"}`} />
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase">
                {recState === "recording" ? `REC ${formatTime(recTime)}` : "START REC"}
              </span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-theme-border/20 border border-theme-border/30 font-mono text-[9px] text-theme-text-muted">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              MOOD: <span className="text-theme-text-primary font-bold">{mood}</span>
            </span>
          </div>
        </div>

        {/* Right Section: Telemetry & User Profile */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 font-mono text-[10px] text-theme-text-secondary select-none"
            title="WebSocket Network Latency"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>{latency}ms</span>
            <span className="text-[8px] text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.5 rounded uppercase">
              HQ
            </span>
          </div>
          <div className="h-4 w-px bg-theme-border/30" />
          <div className="flex items-center gap-2 cursor-pointer" title="Your Settings">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-400 flex items-center justify-center text-[10px] font-bold text-black border border-theme-border/30">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-theme-text-primary truncate max-w-[80px]">
              {userName}
            </span>
          </div>
          <button
            onClick={onToggleSimPanel}
            className={`p-1.5 rounded border transition-colors outline-none cursor-pointer ${
              showSimPanel
                ? "bg-theme-text-primary text-theme-bg border-transparent"
                : "bg-theme-text-primary/5 border-theme-border text-theme-text-secondary hover:text-theme-text-primary"
            }`}
            title="Lobby/Simulator Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulation Panel */}
      <AnimatePresence>
        {showSimPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-theme-surface border-b border-theme-border/30 px-5 py-4 flex flex-wrap gap-4 items-center justify-between text-xs overflow-hidden"
          >
            <div className="flex flex-col gap-1 text-left">
              <span className="font-mono text-[10px] uppercase text-theme-text-muted tracking-wider">
                Developer Simulation Controls
              </span>
              <p className="text-[10px] text-theme-text-secondary font-light">
                Inspect grid scaling, hand gestures, and voice commands.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={onAddMockParticipant}
                className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-primary hover:bg-theme-text-primary/10 border border-theme-border flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Mock Member
              </button>
              <button
                onClick={onRemoveMockParticipant}
                className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-primary hover:bg-theme-text-primary/10 border border-theme-border flex items-center gap-1"
              >
                <Minus className="w-3 h-3" /> Remove Member
              </button>
              {["Thumbs Up", "Peace Sign", "Wave", "Double Palm"].map((g) => (
                <button
                  key={g}
                  onClick={() => onSimulateGesture(g)}
                  className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-secondary hover:text-theme-text-primary border border-theme-border"
                >
                  ✋ {g}
                </button>
              ))}
              {["mute", "unmute", "raise hand", "leave"].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => onSimulateVoiceCommand(cmd)}
                  className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-secondary hover:text-theme-text-primary border border-theme-border flex items-center gap-1"
                >
                  <Languages className="w-3 h-3" /> {cmd}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
