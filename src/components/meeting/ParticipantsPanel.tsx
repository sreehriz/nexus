import React from "react";
import { AlertTriangle } from "lucide-react";
import { Participant } from "./types";

interface ParticipantsPanelProps {
  participants: Participant[];
  joinRequests: { id: string; name: string }[];
  onAdmit: (id: string) => void;
  onDeny: (id: string) => void;
  onToggleMute: (id: string) => void;
  onKick: (id: string) => void;
  currentUserId?: string;
}

export default function ParticipantsPanel({
  participants,
  joinRequests,
  onAdmit,
  onDeny,
  onToggleMute,
  onKick,
  currentUserId = "you",
}: ParticipantsPanelProps) {
  const isOrganizer = participants.find((p) => p.id === currentUserId)?.role === "Organizer";

  return (
    <div className="flex flex-col gap-4 text-left h-full">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
        <span>Participants List</span>
        <span>Total: {participants.length}</span>
      </div>

      {/* Join request approvals queue */}
      {joinRequests.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 font-bold uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Approve Join Request</span>
          </div>
          {joinRequests.map((req) => (
            <div key={req.id} className="flex justify-between items-center bg-theme-bg/60 p-2 rounded-lg text-xs">
              <span className="text-theme-text-primary font-medium">{req.name}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onAdmit(req.id)}
                  className="px-2 py-1 bg-theme-text-primary text-theme-bg rounded text-[10px] font-semibold cursor-pointer"
                >
                  Admit
                </button>
                <button
                  onClick={() => onDeny(req.id)}
                  className="px-2 py-1 border border-theme-border hover:bg-theme-text-primary/5 rounded text-[10px] text-theme-text-secondary cursor-pointer"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {participants.map((p) => (
          <div
            key={p.id}
            className="p-2.5 rounded-xl bg-theme-surface/40 hover:bg-theme-surface/65 border border-theme-border/20 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-[10px] font-bold text-black border border-theme-border/30`}
              >
                {p.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-theme-text-primary truncate max-w-[120px]" title={p.name}>
                  {p.name}
                </span>
                <span className="text-[9px] font-mono text-theme-text-muted uppercase mt-0.5">{p.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {p.id !== currentUserId && (
                <>
                  <button
                    onClick={() => onToggleMute(p.id)}
                    className={`px-2 py-1 rounded text-[9px] font-semibold cursor-pointer border ${
                      p.isMuted
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-theme-text-primary/5 border-theme-border text-theme-text-secondary hover:text-theme-text-primary"
                    }`}
                  >
                    {p.isMuted ? "Unmute" : "Mute"}
                  </button>
                  {isOrganizer && (
                    <button
                      onClick={() => onKick(p.id)}
                      className="px-2 py-1 rounded bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-500 text-[9px] font-semibold cursor-pointer"
                    >
                      Kick
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
