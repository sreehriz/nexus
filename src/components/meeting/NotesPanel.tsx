import React from "react";
import { Sparkle } from "lucide-react";

interface NotesPanelProps {
  meetingNotes: string;
  onChangeNotes: (notes: string) => void;
  onSmartNoteify: () => void;
}

export default function NotesPanel({ meetingNotes, onChangeNotes, onSmartNoteify }: NotesPanelProps) {
  return (
    <div className="flex-1 flex flex-col gap-3 h-full justify-between text-left">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
        <span>Shared Workspace Notes</span>
        <button
          onClick={onSmartNoteify}
          className="text-[9px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 font-bold uppercase tracking-wider"
          title="AI Summarize Transcript to Notes"
        >
          <Sparkle className="w-3 h-3" />
          <span>Smart Noteify</span>
        </button>
      </div>

      <textarea
        value={meetingNotes}
        onChange={(e) => onChangeNotes(e.target.value)}
        className="flex-1 bg-theme-text-primary/5 border border-theme-border/20 rounded-xl p-3 font-mono text-[10.5px] text-theme-text-secondary placeholder-theme-text-muted/40 focus:border-theme-text-primary/30 outline-none resize-none leading-relaxed min-h-[300px]"
        placeholder="Collaboratively edit notes here..."
      />
    </div>
  );
}
