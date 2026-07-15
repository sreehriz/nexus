import React from "react";
import { Brain } from "lucide-react";
import { TranscriptLine, ActionItem, Decision } from "./types";

interface AIPanelProps {
  transcript: TranscriptLine[];
  actionItems: ActionItem[];
  decisions: Decision[];
  onGenerateMOM: () => void;
}

export default function AIPanel({ transcript, actionItems, decisions, onGenerateMOM }: AIPanelProps) {
  return (
    <div className="flex flex-col gap-5 text-left text-xs font-sans h-full">
      {/* Live transcripts feed */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <span className="font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1 block">
          Live Transcription Log
        </span>
        <div className="space-y-3 overflow-y-auto pr-1 bg-theme-bg/30 p-2.5 rounded-xl border border-theme-border/25 flex-1 min-h-[150px]">
          {transcript.length === 0 ? (
            <p className="text-[10px] text-theme-text-muted text-center py-4">No speech detected yet...</p>
          ) : (
            transcript.map((line, idx) => (
              <div key={idx} className="leading-relaxed border-b border-theme-border/5 pb-2">
                <div className="flex justify-between text-[9px] font-mono text-cyan-400 mb-0.5">
                  <span>{line.speaker}</span>
                  <span>{line.timestamp}</span>
                </div>
                <p className="text-theme-text-secondary text-[11px]">"{line.text}"</p>
                {line.translation && (
                  <p className="text-[10px] text-cyan-400 italic mt-0.5">↳ Translation: "{line.translation}"</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detected Actions and Decisions */}
      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1 block">
          AI Real-Time Highlights
        </span>
        
        <div className="grid grid-cols-1 gap-2.5">
          <div className="p-3 rounded-xl border border-theme-border/20 bg-theme-surface/50">
            <span className="font-semibold text-theme-text-primary font-mono text-[10px] block mb-1">
              Action Items Detected:
            </span>
            <ul className="space-y-1.5 text-[11px] text-theme-text-secondary">
              {actionItems.length === 0 ? (
                <li className="text-[10px] text-theme-text-muted italic">None yet</li>
              ) : (
                actionItems.slice(0, 2).map((a, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-pink-500 font-bold shrink-0">•</span>
                    <span>{a.text} ({a.assignee})</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="p-3 rounded-xl border border-theme-border/20 bg-theme-surface/50">
            <span className="font-semibold text-theme-text-primary font-mono text-[10px] block mb-1">
              Decisions Registered:
            </span>
            <ul className="space-y-1.5 text-[11px] text-theme-text-secondary">
              {decisions.length === 0 ? (
                <li className="text-[10px] text-theme-text-muted italic">None yet</li>
              ) : (
                decisions.map((d, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0">•</span>
                    <span>{d.text}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1 border-t border-theme-border/25">
        <button
          onClick={onGenerateMOM}
          className="w-full py-2.5 bg-theme-text-primary text-theme-bg font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono text-[10px] tracking-wider"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Generate MOM Minutes</span>
        </button>
      </div>
    </div>
  );
}
