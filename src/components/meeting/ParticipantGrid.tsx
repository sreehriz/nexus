import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hand, MicOff, Maximize2 } from "lucide-react";
import { Participant } from "./types";

// VideoStream helper — renders a MediaStream into a <video> element
function VideoStream({ stream, muted }: { stream: MediaStream | null; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-theme-bg/30 text-theme-text-muted text-[10px] font-mono select-none">
        No Feed Available
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover rounded-xl"
    />
  );
}

interface ParticipantGridProps {
  participants: Participant[];
  activeSpeakerId: string;
  pinnedSpeakerId: string | null;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peerStreams: { [sid: string]: MediaStream };
  gridLayoutClass: string;
  onSetPinnedSpeaker: (id: string | null) => void;
}

export default function ParticipantGrid({
  participants,
  activeSpeakerId,
  pinnedSpeakerId,
  isScreenSharing,
  localStream,
  screenStream,
  peerStreams,
  gridLayoutClass,
  onSetPinnedSpeaker,
}: ParticipantGridProps) {
  return (
    <div className={`grid gap-4 p-4 ${gridLayoutClass}`}>
      <AnimatePresence>
        {participants.map((p) => {
          const isActiveSpeaker = p.id === activeSpeakerId;
          const isPinned = p.id === pinnedSpeakerId;

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className={`relative rounded-2xl border bg-theme-surface/75 overflow-hidden flex flex-col justify-between p-4 shadow-xl transition-all aspect-video duration-300 group ${
                isActiveSpeaker
                  ? "border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                  : "border-theme-border/20"
              }`}
            >
              {isActiveSpeaker && (
                <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
              )}

              {/* Card Header: name + badges */}
              <div className="flex items-start justify-between z-10 select-none">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-semibold text-theme-text-primary bg-theme-bg/60 backdrop-blur px-2.5 py-1 rounded-lg border border-theme-border/20">
                    {p.name}
                  </span>
                  {p.role !== "Participant" && (
                    <span className="text-[8px] font-mono uppercase tracking-wider font-extrabold text-theme-bg bg-theme-text-primary px-1.5 py-0.5 rounded">
                      {p.role}
                    </span>
                  )}
                  {isPinned && (
                    <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-900/30 px-1.5 py-0.5 rounded uppercase">
                      Pinned
                    </span>
                  )}
                </div>
                {p.isHandRaised && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="p-1.5 rounded-lg bg-amber-500 text-black border border-amber-400/20 flex items-center justify-center"
                  >
                    <Hand className="w-3.5 h-3.5 fill-black" />
                  </motion.div>
                )}
              </div>

              {/* Video / Avatar */}
              <div className="flex-1 flex items-center justify-center relative my-2 overflow-hidden rounded-xl bg-theme-bg/30 border border-theme-border/10">
                {p.isVideoOff && !p.isSharingScreen ? (
                  <div className="relative">
                    {isActiveSpeaker && p.audioLevel > 0 && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-[-10px] rounded-full border border-theme-border/30 pointer-events-none"
                      />
                    )}
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-16 h-16 rounded-full object-cover border border-theme-border/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-xl font-bold text-black border border-theme-border/30`}
                      >
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ) : (
                  <VideoStream
                    stream={
                      p.id === "you"
                        ? isScreenSharing
                          ? screenStream
                          : localStream
                        : peerStreams[p.id] ?? null
                    }
                    muted={p.id === "you"}
                  />
                )}
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5">
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <div className="flex items-center gap-0.5 h-3 select-none">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={`w-0.5 rounded bg-emerald-500 transition-all ${
                            isActiveSpeaker && p.audioLevel > 0 ? "h-3 animate-pulse" : "h-1"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <span className="font-mono text-[9px] text-theme-text-muted">{p.ping}ms</span>
                </div>

                {/* Hover actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => onSetPinnedSpeaker(isPinned ? null : p.id)}
                    className="p-1 rounded bg-theme-bg/60 border border-theme-border/20 text-theme-text-secondary hover:text-theme-text-primary text-[10px]"
                    title="Pin Video Stream"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
