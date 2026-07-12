import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Radio,
  Users,
  MessageSquare,
  Send,
  MoreVertical,
  Wifi,
  Sparkles,
  Layers,
  ChevronRight,
  Tv,
  Maximize2,
  X,
  Bell,
  AlertCircle,
  Cpu
} from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;
  ping: number;
}

export default function DashboardMockup({ onLeave }: { onLeave?: () => void }) {
  const { data: metrics, loading, error } = useDashboardData();

  // --- Meeting States ---
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [latency, setLatency] = useState(16);
  const [activeSpeakerId, setActiveSpeakerId] = useState("sophia");
  const [notifications, setNotifications] = useState<string[]>([]);
  
  // --- Chat Stream ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "Liam Drake", text: "The network layers are operating with zero packet loss.", time: "11:24 AM" },
    { id: "2", sender: "Sophia Vance", text: "Stunning! The color grading on the streams is incredibly balanced.", time: "11:25 AM" },
    { id: "3", sender: "Marcus Vance", text: "I am ready to pull up the final system schematics.", time: "11:25 AM" },
  ]);
  const [newMsgText, setNewMsgText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- Caption Engine ---
  const [activeCaption, setActiveCaption] = useState("");
  const [captionCharIdx, setCaptionCharIdx] = useState(0);

  const dialogSequence = [
    { speaker: "sophia", text: "Nexus utilizes end-to-end vector quantization to compress streaming bandwidth while maintaining 4K resolution." },
    { speaker: "liam", text: "Our latency metrics are consistently sub-20ms, running over custom edge routing nodes designed for modern global collaboration." },
    { speaker: "marcus", text: "If we toggle the spatial audio render, you can hear the directional distance of each presenter in the virtual workspace." },
    { speaker: "sophia", text: "We have also integrated real-time transcription filters that index action items directly during the call." },
  ];
  const [dialogIdx, setDialogIdx] = useState(0);

  // --- Participants State ---
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "you", name: "You", role: "Organizer", avatarColor: "from-[#A3A3A3] to-[#E6E6E6]", isMuted: !isMicOn, isVideoOff: !isCamOn, isSharingScreen: isScreenSharing, ping: 14 },
    { id: "sophia", name: "Sophia Vance", role: "Creative Dir.", avatarColor: "from-[#4F4F4F] to-[#A3A3A3]", isMuted: false, isVideoOff: false, isSharingScreen: false, ping: 18 },
    { id: "liam", name: "Liam Drake", role: "Tech Lead", avatarColor: "from-[#262626] to-[#737373]", isMuted: false, isVideoOff: false, isSharingScreen: false, ping: 22 },
    { id: "marcus", name: "Marcus Vance", role: "Architect", avatarColor: "from-[#171717] to-[#525252]", isMuted: true, isVideoOff: false, isSharingScreen: false, ping: 15 },
  ]);

  // Sync "You" states in participants list
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === "you"
          ? { ...p, isMuted: !isMicOn, isVideoOff: !isCamOn, isSharingScreen: isScreenSharing }
          : p
      )
    );
  }, [isMicOn, isCamOn, isScreenSharing]);

  // --- Random Latency Telemetry Simulation ---
  useEffect(() => {
    const latInterval = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setLatency((prev) => Math.max(11, Math.min(28, prev + delta)));
    }, 4000);
    return () => clearInterval(latInterval);
  }, []);

  // --- Recording Timer ---
  useEffect(() => {
    let recInterval: any;
    if (isRecording) {
      recInterval = setInterval(() => {
        setRecTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecTime(0);
    }
    return () => clearInterval(recInterval);
  }, [isRecording]);

  // --- Notification Toast Manager ---
  const triggerNotification = (msg: string) => {
    setNotifications((prev) => [...prev.slice(-2), msg]); // Keep at most 3 notifications
  };

  // Automatically clear notifications after 4 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // --- Caption & Speaker Cycle Simulation ---
  useEffect(() => {
    // Determine the current line of dialogue
    const currentDialogue = dialogSequence[dialogIdx];
    
    // Set active speaker to match the dialogue source
    setActiveSpeakerId(currentDialogue.speaker);
    
    // Reset typing index and text
    setCaptionCharIdx(0);
    setActiveCaption("");

    let currentStr = "";
    const textToType = currentDialogue.text;
    
    // Type out the dialog letter-by-letter
    const typingTimer = setInterval(() => {
      if (currentStr.length < textToType.length) {
        currentStr += textToType.charAt(currentStr.length);
        setActiveCaption(currentStr);
      } else {
        clearInterval(typingTimer);
        // Wait 4 seconds after finishing typing, then cycle dialogue
        const pauseTimer = setTimeout(() => {
          setDialogIdx((prev) => (prev + 1) % dialogSequence.length);
        }, 4000);
        return () => clearTimeout(pauseTimer);
      }
    }, 35);

    return () => {
      clearInterval(typingTimer);
    };
  }, [dialogIdx]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMsgText.trim()) return;

    const myMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      text: newMsgText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setChatMessages((prev) => [...prev, myMsg]);
    setNewMsgText("");
    triggerNotification("Message transmitted successfully");

    // Trigger auto replies from Liam or Sophia sometimes to feel alive!
    setTimeout(() => {
      const replies = [
        "Liam Drake: Copy that. Applying visual buffer filters now.",
        "Sophia Vance: Brilliant perspective, let's detail that in the pitch.",
        "Marcus Vance: I'm rendering a 3D overlay for that idea."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const [sender, ...textParts] = randomReply.split(": ");
      const text = textParts.join(": ");

      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender,
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      triggerNotification(`New chat from ${sender}`);
    }, 1500);
  };

  // Toggle user speaker audio or video
  const toggleParticipantMic = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updatedMuted = !p.isMuted;
          triggerNotification(`${p.name} ${updatedMuted ? "muted" : "unmuted"}`);
          if (id === "you") setIsMicOn(!updatedMuted);
          return { ...p, isMuted: updatedMuted };
        }
        return p;
      })
    );
  };

  const toggleParticipantVideo = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updatedVideo = !p.isVideoOff;
          triggerNotification(`${p.name} camera turned ${updatedVideo ? "off" : "on"}`);
          if (id === "you") setIsCamOn(!updatedVideo);
          return { ...p, isVideoOff: updatedVideo };
        }
        return p;
      })
    );
  };

  const selectActiveSpeaker = (id: string) => {
    setActiveSpeakerId(id);
    const p = participants.find((part) => part.id === id);
    if (p) {
      triggerNotification(`Active stream focus: ${p.name}`);
    }
  };

  const getActiveSpeakerName = () => {
    const p = participants.find((part) => part.id === activeSpeakerId);
    return p ? p.name : "System";
  };

  // --- Loader Skeleton Screen ---
  if (loading) {
    return (
      <div className="relative w-full h-[600px] max-w-5xl mx-auto glass-panel rounded-2xl border border-theme-glass-border overflow-hidden flex flex-col backdrop-blur-md animate-pulse">
        {/* Skeleton Top Header */}
        <div className="px-5 py-4 border-b border-theme-border/30 flex items-center justify-between bg-theme-bg/25">
          <div className="flex items-center gap-3">
            <div className="w-16 h-5 rounded bg-theme-text-primary/10" />
            <div className="w-24 h-5 rounded bg-theme-text-primary/10 border border-theme-border/20" />
          </div>
          <div className="w-36 h-4 rounded bg-theme-text-primary/10 hidden md:block" />
          <div className="w-20 h-5 rounded bg-theme-text-primary/10" />
        </div>

        {/* Skeleton Middle Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-[380px]">
          {/* Main Video Arena Skeleton */}
          <div className="lg:col-span-3 p-4 flex flex-col gap-4">
            <div className="flex-1 rounded-xl border border-theme-border/20 bg-theme-surface/50 relative overflow-hidden flex flex-col items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-full bg-theme-text-primary/10" />
              <div className="w-32 h-5 rounded bg-theme-text-primary/10" />
              <div className="w-20 h-3 rounded bg-theme-text-primary/5" />
              <div className="flex items-center gap-1.5 mt-2 h-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-8 bg-theme-text-primary/10 rounded-full" />
                ))}
              </div>
            </div>
            {/* Captions Skeleton */}
            <div className="glass-panel rounded-xl p-4 min-h-[72px] bg-theme-surface/30">
              <div className="w-12 h-3 rounded bg-theme-text-primary/10 mb-2" />
              <div className="w-full h-3 rounded bg-theme-text-primary/5" />
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="border-t lg:border-t-0 lg:border-l border-theme-border/20 flex flex-col bg-theme-bg/10 p-4 gap-5">
            {/* Diagnostics Widget Skeleton */}
            <div className="flex flex-col gap-2.5">
              <div className="w-28 h-3 rounded bg-theme-text-primary/10" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 rounded bg-theme-text-primary/5 border border-theme-border/30" />
                <div className="h-12 rounded bg-theme-text-primary/5 border border-theme-border/30" />
                <div className="h-12 rounded bg-theme-text-primary/5 border border-theme-border/30" />
              </div>
            </div>

            {/* Participants List Skeleton */}
            <div className="flex flex-col gap-2.5">
              <div className="w-24 h-3 rounded bg-theme-text-primary/10" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-theme-text-primary/10" />
                    <div className="flex-1 space-y-1">
                      <div className="w-20 h-3 rounded bg-theme-text-primary/10" />
                      <div className="w-12 h-2 rounded bg-theme-text-primary/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Frame Skeleton */}
            <div className="flex-1 flex flex-col gap-2.5 mt-2">
              <div className="w-24 h-3 rounded bg-theme-text-primary/10" />
              <div className="flex-1 bg-theme-text-primary/5 border border-theme-border/20 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Skeleton Bottom Toolbar */}
        <div className="px-6 py-4 border-t border-theme-border/30 flex items-center justify-between bg-theme-bg/40">
          <div className="w-32 h-4 rounded bg-theme-text-primary/10 hidden sm:block" />
          <div className="flex gap-3.5 mx-auto sm:mx-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-theme-text-primary/10" />
            ))}
          </div>
          <div className="w-10 h-10 rounded-full bg-theme-text-primary/10 hidden sm:block" />
        </div>
      </div>
    );
  }

  // --- Fallback Error Boundary Screen ---
  if (error) {
    return (
      <div className="relative w-full h-[350px] max-w-5xl mx-auto glass-panel rounded-2xl border border-red-500/25 p-8 flex flex-col items-center justify-center text-center gap-4 bg-red-500/5 text-theme-text-primary backdrop-blur-md">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-red-200">Database Handshake Failed</h3>
          <p className="text-xs text-theme-text-muted mt-1 max-w-md mx-auto">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary hover:opacity-90 rounded-xl transition-all cursor-pointer outline-none shadow-md hover:shadow-lg"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full max-w-5xl mx-auto glass-panel rounded-2xl border border-theme-glass-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col backdrop-blur-md">
      {/* --- Top Header Area of Meeting Room --- */}
      <div className="px-5 py-3.5 border-b border-theme-border/30 flex items-center justify-between bg-theme-bg/25">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-theme-text-primary/5 border border-theme-border/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] tracking-wide text-theme-text-muted">LIVE</span>
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-950/20 dark:bg-red-950/40 border border-red-900/30 text-red-500 dark:text-red-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-[11px] font-bold tracking-widest">REC {formatRecTime(recTime)}</span>
            </motion.div>
          )}

          <div className="hidden sm:flex items-center gap-1 text-xs text-theme-text-secondary font-medium border-l border-theme-border/30 pl-3">
            <Sparkles className="w-3.5 h-3.5 text-theme-text-muted/60" />
            <span>Room ID: <span className="font-mono text-theme-text-primary">nex-794-slv</span></span>
          </div>
        </div>

        {/* Central Title/Presenter name */}
        <div className="hidden md:block text-xs font-panchang font-bold text-theme-text-secondary tracking-widest uppercase">
          Nexus Cinematic Workspace
        </div>

        {/* Right telemetries */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-theme-text-secondary">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>{latency}ms <span className="text-[9px] text-emerald-500/80">(HQ)</span></span>
          </div>

          <div className="w-px h-4 bg-theme-border/30" />

          <button
            onClick={() => triggerNotification("Workspace layout optimized")}
            title="Optimize layout"
            className="p-1.5 rounded-md hover:bg-theme-text-primary/5 text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- Middle Grid: Screen layout (Split view or Left Video, Right sidebar) --- */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 min-h-[380px] md:min-h-[460px] max-h-[640px]">
        {/* Main Video Arena (Grid Col span 3) */}
        <div className="lg:col-span-3 p-4 flex flex-col gap-4 relative bg-gradient-to-b from-transparent to-theme-bg/10">
          
          {/* Active Screen Stage */}
          <div className="flex-1 rounded-xl border border-theme-border/20 relative overflow-hidden bg-theme-surface/80 flex items-center justify-center shadow-inner group">
            {/* Ambient Background Glow matching speaking state */}
            <div className="absolute inset-0 radial-glow opacity-60 pointer-events-none" />

            {/* Simulated Active Feed Content */}
            <AnimatePresence mode="wait">
              {isScreenSharing && activeSpeakerId === "you" ? (
                // --- Screen Sharing Blueprint Mockup ---
                <motion.div
                  key="screenshare"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 p-6 flex flex-col justify-between font-mono bg-theme-bg/95 text-theme-text-secondary"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                  
                  {/* Blueprint visual */}
                  <div className="flex items-center justify-between border-b border-theme-border/30 pb-3">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-theme-text-muted animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-theme-text-primary">Presenting: System Architecture Blueprint</span>
                    </div>
                    <div className="px-2 py-0.5 rounded text-[9px] bg-theme-text-primary/10 border border-theme-border/40 text-theme-text-secondary">4K / 60 FPS</div>
                  </div>

                  {/* Wireframe UI render */}
                  <div className="flex-1 flex flex-col items-center justify-center relative p-4">
                    <div className="w-full max-w-md border border-theme-border/30 p-4 rounded bg-theme-bg/40 backdrop-blur-sm relative">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="w-1.5 h-1.5 rounded-full bg-theme-text-primary/20" />
                        <span className="w-1.5 h-1.5 rounded-full bg-theme-text-primary/20" />
                      </div>
                      <div className="text-[10px] text-theme-text-muted mb-2 uppercase tracking-widest font-bold">Node pipeline matrix</div>
                      
                      {/* Interactive looking CSS bar bars */}
                      <div className="space-y-1.5 mt-2">
                        {[
                          { label: "Stream Engine Compressor", fill: "w-[85%]" },
                          { label: "Edge Relay Core Latency", fill: "w-[12%]" },
                          { label: "Vector Packet Matrix Sync", fill: "w-[64%]" }
                        ].map((bar, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-[8px] text-theme-text-muted/80">
                              <span>{bar.label}</span>
                              <span className="font-mono">{bar.fill.replace('w-[', '').replace(']', '')}</span>
                            </div>
                            <div className="h-1 bg-theme-text-primary/5 rounded-full overflow-hidden mt-0.5">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: bar.fill.replace('w-[', '').replace(']', '') }}
                                transition={{ duration: 1.5, delay: idx * 0.2 }}
                                className="h-full bg-theme-text-primary/60"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-theme-text-muted border-t border-theme-border/20 pt-2">
                    <span>Rendering 3D vector mesh...</span>
                    <span>Buffer load: 0.12ms</span>
                  </div>
                </motion.div>
              ) : (
                // --- Standard Active Speaker Portrait Mockup ---
                <motion.div
                  key={activeSpeakerId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none"
                >
                  {/* Big Stylized Circular Vector Avatar */}
                  <div className="relative mb-4">
                    {/* Pulsing visual circles representing audio energy */}
                    {activeSpeakerId !== "you" || isMicOn ? (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                          className="absolute inset-[-15px] rounded-full border border-theme-border/20 pointer-events-none"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.8, 1] }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                          className="absolute inset-[-30px] rounded-full border border-theme-border/10 pointer-events-none"
                        />
                      </>
                    ) : null}

                    {/* Central Monogram Card */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-theme-surface to-theme-secondary flex items-center justify-center shadow-xl border border-theme-border/30 relative overflow-hidden">
                      <span className="font-display font-bold text-3xl tracking-widest text-theme-text-primary">
                        {getActiveSpeakerName().split(" ").map((n) => n[0]).join("")}
                      </span>
                      {/* Elegant reflection shine */}
                      <div className="absolute inset-0 bg-gradient-to-b from-theme-text-primary/10 to-transparent pointer-events-none" />
                    </div>

                    {/* Small Status Pill overlay */}
                    {activeSpeakerId === "you" && !isCamOn && (
                      <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-theme-bg border border-theme-border text-red-500 shadow-lg">
                        <VideoOff className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Speaker Meta Labels */}
                  <h3 className="text-theme-text-primary font-display font-medium text-lg tracking-wide">
                    {getActiveSpeakerName()}
                  </h3>
                  <p className="text-xs text-theme-text-muted mt-1 font-mono tracking-wider uppercase">
                    {participants.find((p) => p.id === activeSpeakerId)?.role || "Presenter"}
                  </p>

                  {/* Active Speaker reactive microphone wave visualizer */}
                  {(activeSpeakerId !== "you" || isMicOn) && (
                    <div className="flex items-center gap-1.5 mt-5 h-6">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((bar, idx) => (
                        <motion.div
                          key={idx}
                          animate={{
                            height: [
                              "6px",
                              `${Math.max(6, Math.floor(Math.random() * 24))}px`,
                              "6px"
                            ]
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6 + idx * 0.05,
                            ease: "easeInOut"
                          }}
                          className="w-1 bg-theme-text-primary/70 rounded-full"
                        />
                      ))}
                    </div>
                  )}

                  {activeSpeakerId === "you" && !isMicOn && (
                    <div className="mt-4 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 text-[10px] uppercase font-mono tracking-widest">
                      Microphone Muted
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- Corner stats Overlays inside Video box --- */}
            <div className="absolute bottom-3 left-3 bg-theme-bg/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-theme-border flex items-center gap-2">
              <span className="text-[11px] font-medium text-theme-text-primary">
                {isScreenSharing && activeSpeakerId === "you" ? "Screen Share active" : getActiveSpeakerName()}
              </span>
              <div className="flex gap-1 h-2 items-center">
                <span className="w-1 h-2 rounded-full bg-theme-text-secondary/60" />
                <span className="w-1 h-3 rounded-full bg-theme-text-primary" />
                <span className="w-1 h-1.5 rounded-full bg-theme-text-secondary/40" />
              </div>
            </div>

            <div className="absolute top-3 right-3 bg-theme-bg/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-theme-border flex items-center gap-1.5 text-[10px] text-theme-text-secondary">
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
              <span>4K Ultra HD</span>
            </div>

            {/* Quick overlay tooltip for double click */}
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none text-[10px] text-theme-text-muted/40 font-mono">
              Double-click to expand viewport
            </div>
          </div>

          {/* --- Bottom Captions Panel in Video Column --- */}
          <div className="glass-panel rounded-xl p-3.5 min-h-[72px] flex items-start gap-3 relative overflow-hidden hover:bg-theme-surface/30 transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-theme-text-secondary/40 mt-1.5 animate-pulse" />
            <div className="flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted mb-0.5 flex items-center gap-1.5">
                <span>Captions</span>
                <span className="text-[8px] bg-theme-text-primary/10 px-1.5 py-0.5 rounded text-theme-text-secondary">Real-Time</span>
              </div>
              <p className="text-xs text-theme-text-secondary leading-relaxed font-sans italic">
                <span className="font-semibold text-theme-text-primary not-italic mr-1.5">
                  {participants.find((p) => p.id === activeSpeakerId)?.name || "System"}:
                </span>
                "{activeCaption}"
              </p>
            </div>
            
            {/* Soft decorative background pattern */}
            <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-white/[0.015] to-transparent pointer-events-none" />
          </div>
        </div>

        {/* --- Sidebar (Participant list, Diagnostics, & Live Chat) (Grid Col 1) --- */}
        <div className="border-t lg:border-t-0 lg:border-l border-theme-border/20 flex flex-col max-h-[640px] bg-theme-bg/10">
          
          {/* Section: Node Diagnostics (Supabase Connected telemetry metrics) */}
          <div className="p-4 border-b border-theme-border/20 bg-theme-bg/5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-theme-text-muted select-none">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Node Diagnostics</span>
              </span>
              <span className="text-[8px] text-emerald-500 font-bold tracking-wider">SECURE</span>
            </div>

            {/* Stats Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-panel p-2.5 rounded-xl text-center flex flex-col gap-0.5 border-transparent bg-theme-bg/20 select-none">
                <span className="text-[8px] font-mono text-theme-text-muted">PROJECTS</span>
                <span className="text-xs font-semibold text-theme-text-primary">{metrics?.total_projects ?? 0}</span>
              </div>
              <div className="glass-panel p-2.5 rounded-xl text-center flex flex-col gap-0.5 border-transparent bg-theme-bg/20 select-none">
                <span className="text-[8px] font-mono text-theme-text-muted">TASKS</span>
                <span className="text-xs font-semibold text-theme-text-primary">{metrics?.active_tasks ?? 0}</span>
              </div>
              <div className="glass-panel p-2.5 rounded-xl text-center flex flex-col gap-0.5 border-transparent bg-theme-bg/20 select-none">
                <span className="text-[8px] font-mono text-theme-text-muted">USAGE</span>
                <span className="text-xs font-semibold text-theme-text-primary">{metrics?.monthly_usage ?? 0}h</span>
              </div>
            </div>

            {/* Recent Activity logs feed */}
            {metrics?.recent_activity && metrics.recent_activity.length > 0 && (
              <div className="mt-1 flex flex-col gap-1.5 border-t border-theme-border/10 pt-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-theme-text-muted select-none">
                  Recent Workspace Logs
                </span>
                <div className="space-y-1 max-h-[60px] overflow-y-auto pr-1">
                  {metrics.recent_activity.map((log, i) => (
                    <div key={i} className="flex justify-between items-center text-[9px] font-mono text-theme-text-secondary leading-normal select-none">
                      <span className="truncate max-w-[125px]">{log.event}</span>
                      <span className="text-theme-text-muted shrink-0 text-[8px]">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Participants list */}
          <div className="p-4 border-b border-theme-border/20 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-theme-text-muted">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Participants ({participants.length})</span>
              </span>
              <button
                onClick={() => triggerNotification("Participant invite link copied")}
                className="text-[10px] text-theme-text-secondary hover:text-theme-text-primary cursor-pointer font-medium outline-none"
              >
                + Invite
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded-lg flex items-center justify-between transition-all ${
                    p.id === activeSpeakerId
                      ? "bg-theme-text-primary/5 border border-theme-border/40"
                      : "hover:bg-theme-text-primary/[0.02] border border-transparent"
                  }`}
                >
                  <div
                    onClick={() => selectActiveSpeaker(p.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1"
                  >
                    {/* Small visual avatar badge */}
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-[10px] font-bold text-black border border-theme-border/30`}>
                      {p.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-theme-text-primary truncate max-w-[100px]">
                        {p.name}
                      </span>
                      <span className="text-[9px] text-theme-text-muted font-mono leading-none mt-0.5">
                        {p.role}
                      </span>
                    </div>
                  </div>

                  {/* Micro action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleParticipantMic(p.id)}
                      className={`p-1 rounded hover:bg-theme-text-primary/10 transition-colors cursor-pointer ${
                        p.isMuted ? "text-red-500" : "text-theme-text-secondary/60"
                      }`}
                    >
                      {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => toggleParticipantVideo(p.id)}
                      className={`p-1 rounded hover:bg-theme-text-primary/10 transition-colors cursor-pointer ${
                        p.isVideoOff ? "text-red-500" : "text-theme-text-secondary/60"
                      }`}
                    >
                      {p.isVideoOff ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Live Chat Preview & Input */}
          <div className="flex-1 p-4 flex flex-col gap-3 min-h-[180px] overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-theme-text-muted">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Session Chat</span>
              </span>
              <span className="text-[9px] text-theme-text-muted/40 font-medium">Secure</span>
            </div>

            {/* Chat message streams */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[180px] md:max-h-[220px]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col p-2 rounded-lg text-xs leading-relaxed ${
                    msg.isMe
                      ? "bg-theme-text-primary/5 border border-theme-border/30 ml-4"
                      : "bg-theme-surface/40 border border-theme-border/20 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-theme-text-primary text-[11px] truncate max-w-[100px]">
                      {msg.sender}
                    </span>
                    <span className="text-[9px] text-theme-text-muted/70 font-mono">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-theme-text-secondary break-words text-[11px]">{msg.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat form */}
            <form onSubmit={handleSendChat} className="flex gap-2 mt-auto">
              <input
                type="text"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                placeholder="Type secure message..."
                className="flex-1 bg-theme-text-primary/5 hover:bg-theme-text-primary/8 focus:bg-theme-text-primary/10 border border-theme-border/45 focus:border-theme-text-primary/30 rounded-lg px-3 py-2 text-xs text-theme-text-primary placeholder-theme-text-muted/40 outline-none transition-colors"
              />
              <button
                type="submit"
                className="p-2 bg-theme-text-primary hover:opacity-90 text-theme-bg rounded-lg transition-colors flex items-center justify-center cursor-pointer outline-none"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* --- Bottom Toolbar Dock (Meeting controls) --- */}
      <div className="px-6 py-4 border-t border-theme-border/30 flex items-center justify-between bg-theme-bg/40">
        <div className="hidden sm:block text-xs font-mono text-theme-text-muted">
          Active Speaker: <span className="text-theme-text-primary font-sans font-medium">{getActiveSpeakerName()}</span>
        </div>

        {/* Central Controls Dock (Floating-pill style) */}
        <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
          {/* Mic */}
          <button
            onClick={() => {
              setIsMicOn(!isMicOn);
              triggerNotification(isMicOn ? "Microphone muted" : "Microphone active");
            }}
            className={`p-3.5 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isMicOn
                ? "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Camera */}
          <button
            onClick={() => {
              setIsCamOn(!isCamOn);
              triggerNotification(isCamOn ? "Camera feed disabled" : "Camera feed active");
            }}
            className={`p-3.5 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isCamOn
                ? "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
            }`}
            title={isCamOn ? "Disable Camera" : "Enable Camera"}
          >
            {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={() => {
              setIsScreenSharing(!isScreenSharing);
              if (!isScreenSharing) {
                setActiveSpeakerId("you"); // Force focus to You when screen sharing
              }
              triggerNotification(isScreenSharing ? "Screen sharing terminated" : "Sharing screen stream to workspace");
            }}
            className={`p-3.5 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isScreenSharing
                ? "bg-theme-text-primary text-theme-bg border-transparent shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                : "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
            }`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          >
            <MonitorUp className="w-4 h-4" />
          </button>

          {/* Record */}
          <button
            onClick={() => {
              setIsRecording(!isRecording);
              triggerNotification(isRecording ? "Recording archived" : "Live stream recording started");
            }}
            className={`p-3.5 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isRecording
                ? "bg-red-500 text-white border-transparent animate-pulse"
                : "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
            }`}
            title={isRecording ? "Stop Recording" : "Record Conference"}
          >
            <Radio className="w-4 h-4 animate-spin-slow" />
          </button>

          <div className="w-px h-6 bg-theme-border/30 mx-1" />

          {/* Leave Button */}
          <button
            onClick={onLeave}
            className="cursor-pointer px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 hover:scale-102 active:scale-[0.98] outline-none"
          >
            Leave
          </button>
        </div>

        {/* Right side options */}
        <button
          onClick={() => triggerNotification("Advanced stream options opened")}
          className="hidden sm:flex p-2.5 rounded-full bg-theme-text-primary/5 border border-theme-border text-theme-text-secondary hover:text-theme-text-primary cursor-pointer transition-colors duration-300 outline-none"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* --- In-dashboard Toast Notification Center --- */}
      <div className="absolute top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        <AnimatePresence>
          {notifications.map((notif, idx) => (
            <motion.div
              key={idx + "-" + notif}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="glass-panel-heavy p-3 rounded-xl border border-theme-border flex items-center gap-2.5 shadow-xl text-xs text-theme-text-primary"
            >
              <Bell className="w-4 h-4 text-theme-text-secondary" />
              <div className="flex-1 font-medium">{notif}</div>
              <div className="text-[8px] font-mono text-theme-text-muted">Just now</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
