import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  Smile,
  Users,
  MessageSquare,
  Brain,
  FileText,
  BarChart2,
  Paperclip,
  MoreHorizontal,
  LogOut,
  Shield,
  Settings,
  Trash2,
  ShieldCheck,
  Download,
  Play,
  Pause,
  RefreshCw,
  Plus,
  Send,
  X,
  Wifi,
  Volume2,
  Maximize2,
  Layout,
  HelpCircle,
  Code,
  Edit3,
  Image,
  Award,
  Heart,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  CheckSquare,
  Sparkles,
  ChevronRight,
  Activity,
  UserCheck,
  SmilePlus,
  ArrowRight,
  Globe,
  Sliders,
  Check,
  Languages,
  Sparkle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { io, Socket } from "socket.io-client";

// --- Types & Interfaces ---
interface Participant {
  id: string;
  name: string;
  role: "Organizer" | "Co-Host" | "Participant";
  avatarColor: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  isPinned: boolean;
  ping: number;
  audioLevel: number; // 0 to 100
  language: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
  repliesCount?: number;
  reactions?: { emoji: string; count: number; users: string[] }[];
  isCode?: boolean;
}

interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: string;
  detectedLanguage?: string;
  translation?: string;
}

interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  votedOptionIdx?: number;
  creator: string;
}

interface SharedFile {
  name: string;
  size: string;
  sender: string;
  time: string;
  fileUrl?: string;
}

interface FlyingReaction {
  id: string;
  emoji: string;
  left: number; // percentage width
  delay: number;
}

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

export default function MeetingRoom({ roomCode, onLeave }: { roomCode: string; onLeave?: () => void }) {
  const { user } = useAuth();
  const userName = user?.user_metadata?.fullName || user?.user_metadata?.username || user?.email?.split("@")[0] || "You";

  // --- Layout & Flow States ---
  const [isPostMeeting, setIsPostMeeting] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "chat" | "ai" | "notes" | "polls" | "files" | "whiteboard">("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>("you");
  const [pinnedSpeakerId, setPinnedSpeakerId] = useState<string | null>(null);
  
  // --- Simulation Management Panel ---
  const [showSimPanel, setShowSimPanel] = useState(false);

  // --- Meeting Connection Telemetry ---
  const [recTime, setRecTime] = useState(384); // Simulated start
  const [isRecording, setIsRecording] = useState(true);
  const [recState, setRecState] = useState<"recording" | "paused" | "idle">("recording");
  const [latency, setLatency] = useState(14);
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor">("excellent");

  // --- Controls & Toggles ---
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  // --- Floating Reactions ---
  const [flyingReactions, setFlyingReactions] = useState<FlyingReaction[]>([]);
  const reactionIdCounter = useRef(0);

  // --- Advanced Dropdown Settings ---
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showBgEffectsModal, setShowBgEffectsModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  
  // --- Smart/AI Settings ---
  const [activeBgEffect, setActiveBgEffect] = useState<"none" | "blur" | "matrix" | "cyberpunk" | "tokyo">("none");
  const [isNoiseCancelled, setIsNoiseCancelled] = useState(true);
  const [eyeCorrection, setEyeCorrection] = useState(true);
  const [autoLighting, setAutoLighting] = useState(true);
  const [portraitEnhancement, setPortraitEnhancement] = useState(false);
  const [cameraFraming, setCameraFraming] = useState(true);
  const [voiceEnhanced, setVoiceEnhanced] = useState(true);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);
  const [selectedTranslationLang, setSelectedTranslationLang] = useState<"none" | "ja" | "es" | "de" | "hi">("none");
  const [captionConfig, setCaptionConfig] = useState({
    position: "bottom-overlay" as "bottom-overlay" | "top-overlay",
    size: "medium" as "small" | "medium" | "large",
    opacity: 80 // percentage
  });
  const [gestureRecognitionEnabled, setGestureRecognitionEnabled] = useState(true);
  const [lastDetectedGesture, setLastDetectedGesture] = useState<string | null>(null);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);

  // --- Meeting Mood & Health Scores ---
  const [mood, setMood] = useState<"Focused" | "Excited" | "Confused" | "Silent">("Focused");
  const meetingHealth = useMemo(() => {
    return {
      participation: 95,
      audioQuality: 98,
      speakingBalance: "Balanced",
      networkQuality: 99,
      engagement: 96
    };
  }, []);

  // --- Dynamic Participants List ---
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "you", name: `You (${userName})`, role: "Participant", avatarColor: "from-zinc-200 to-zinc-400", isMuted: !isMicOn, isVideoOff: !isCamOn, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 12, audioLevel: 0, language: "en" }
  ]);

  // --- Host Permissions & Controls ---
  const [lockMeeting, setLockMeeting] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowCamera, setAllowCamera] = useState(true);
  const [allowMic, setAllowMic] = useState(true);
  const [joinRequests, setJoinRequests] = useState<{ id: string; name: string }[]>([
  ]);

  // --- Chat Feed ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsgText, setNewMsgText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // --- AI Transcript Stream & Highlight detection ---
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [liveCaptionText, setLiveCaptionText] = useState("");
  const [liveCaptionSpeaker, setLiveCaptionSpeaker] = useState("");
  const [liveCaptionTranslation, setLiveCaptionTranslation] = useState("");

  const [actionItems, setActionItems] = useState<Array<{ id: string; text: string; assignee: string; done: boolean }>>([]);
  const [decisions, setDecisions] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);

  const [topicTimeline, setTopicTimeline] = useState<Array<{ time: string; topic: string }>>([
    { time: new Date().toTimeString().slice(0, 5), topic: "Meeting Node Handshake Active" }
  ]);

  // --- Meeting Notes Workspace ---
  const [meetingNotes, setMeetingNotes] = useState(
    "# Meeting Notes - Shared Workspace\n- Collaborators can edit this simultaneously in real time."
  );

  // --- Polls Tab ---
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  // --- Files Shared Tab ---
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);

  // --- Whiteboard State & Canvas Drawing ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#FFFFFF");
  const [lineWidth, setLineWidth] = useState(3);
  const [whiteboardFlowcharts, setWhiteboardFlowcharts] = useState<Array<{ id: string; x: number; y: number; type: string; label: string }>>([]);

  // --- WebRTC / Socket.IO Refs & Local States ---
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [sid: string]: RTCPeerConnection }>({});
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<{ [sid: string]: MediaStream }>({});
  const [mySid, setMySid] = useState<string>("");

  // Refs for callbacks to prevent stale state issues
  const isMicOnRef = useRef(isMicOn);
  const isCamOnRef = useRef(isCamOn);
  const isScreenSharingRef = useRef(isScreenSharing);
  const isHandRaisedRef = useRef(isHandRaised);
  const selectedTranslationLangRef = useRef(selectedTranslationLang);

  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
  useEffect(() => { isCamOnRef.current = isCamOn; }, [isCamOn]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
  useEffect(() => { isHandRaisedRef.current = isHandRaised; }, [isHandRaised]);
  useEffect(() => { selectedTranslationLangRef.current = selectedTranslationLang; }, [selectedTranslationLang]);

  // Capture local microphone and camera
  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      stream.getAudioTracks().forEach(t => t.enabled = isMicOnRef.current);
      stream.getVideoTracks().forEach(t => t.enabled = isCamOnRef.current);
    } catch (err) {
      console.warn("Failed to get hardware media, generating fallback visual canvas stream:", err);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#141414";
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = "#4f46e5";
          ctx.font = "14px monospace";
          ctx.fillText("Nexus Video Active", 240, 240);
        }
        const canvasStream = canvas.captureStream(10);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        const oscillator = audioCtx.createOscillator();
        oscillator.connect(dest);
        oscillator.start();
        const mockStream = new MediaStream([
          canvasStream.getVideoTracks()[0],
          dest.stream.getAudioTracks()[0]
        ]);
        localStreamRef.current = mockStream;
        setLocalStream(mockStream);
        mockStream.getAudioTracks().forEach(t => t.enabled = isMicOnRef.current);
        mockStream.getVideoTracks().forEach(t => t.enabled = isCamOnRef.current);
      } catch (mockErr) {
        console.error("Failed to generate mock stream:", mockErr);
      }
    }
  };

  const setupPeerConnection = (peerSid: string, peerName: string, isCaller: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice_candidate", {
          target: peerSid,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("WebRTC track received from peer connection:", peerSid);
      const remoteStream = event.streams[0];
      setPeerStreams(prev => ({
        ...prev,
        [peerSid]: remoteStream
      }));
    };

    if (isCaller) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("sdp_offer", {
            target: peerSid,
            offer: pc.localDescription
          });
        } catch (err) {
          console.error("Error creating WebRTC offer:", err);
        }
      };
    }

    peersRef.current[peerSid] = pc;
    return pc;
  };

  // --- WebSocket connection & WebRTC listeners ---
  useEffect(() => {
    const runSetup = async () => {
      await startLocalMedia();
    };
    runSetup();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      Object.keys(peersRef.current).forEach(sid => {
        peersRef.current[sid].close();
      });
      peersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!localStream) return;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const socketUrl = isLocalhost ? "http://localhost:8000" : window.location.origin;

    const socket = io(socketUrl, {
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setMySid(socket.id || "");
      const role = localStorage.getItem("nexus_role") || "Participant";
      socket.emit("join_room", {
        roomCode,
        userName,
        userId: user?.id,
        role,
        isMuted: !isMicOnRef.current,
        isVideoOff: !isCamOnRef.current
      });
    });

    socket.on("join-success", (data) => {
      setParticipants([
        { id: "you", name: `You (${userName})`, role: data.role || "Participant", avatarColor: "from-zinc-200 to-zinc-400", isMuted: !isMicOnRef.current, isVideoOff: !isCamOnRef.current, isSharingScreen: isScreenSharingRef.current, isHandRaised: isHandRaisedRef.current, isPinned: false, ping: 12, audioLevel: 0, language: "en" },
        ...data.participants.filter((p: any) => p.id !== socket.id)
      ]);
      setMeetingNotes(data.notes || "");
      setLockMeeting(data.roomSettings.lockMeeting);
      setWaitingRoomEnabled(data.roomSettings.waitingRoomEnabled);
      setAllowChat(data.roomSettings.allowChat);
      setAllowScreenShare(data.roomSettings.allowScreenShare);
      setAllowMic(data.roomSettings.allowMic);
      setAllowCamera(data.roomSettings.allowCamera);

      data.participants.forEach((p: any) => {
        if (p.id !== socket.id) {
          if (socket.id! < p.id) {
            setupPeerConnection(p.id, p.name, true);
          } else {
            setupPeerConnection(p.id, p.name, false);
          }
        }
      });
    });

    socket.on("participant-joined", (peer) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === peer.id)) return prev;
        return [...prev, peer];
      });

      if (socket.id! < peer.id) {
        setupPeerConnection(peer.id, peer.name, true);
      } else {
        setupPeerConnection(peer.id, peer.name, false);
      }
    });

    socket.on("participant-left", (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.sid));
      setPeerStreams(prev => {
        const next = { ...prev };
        delete next[data.sid];
        return next;
      });
      if (peersRef.current[data.sid]) {
        peersRef.current[data.sid].close();
        delete peersRef.current[data.sid];
      }
    });

    socket.on("sdp-offer", async (data) => {
      let pc = peersRef.current[data.sender];
      if (!pc) {
        pc = setupPeerConnection(data.sender, "Peer", false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("sdp_answer", {
          target: data.sender,
          answer: pc.localDescription
        });
      } catch (err) {
        console.error("Error setting local SDP answer:", err);
      }
    });

    socket.on("sdp-answer", async (data) => {
      const pc = peersRef.current[data.sender];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error("Error setting remote SDP answer:", err);
        }
      }
    });

    socket.on("ice-candidate", async (data) => {
      const pc = peersRef.current[data.sender];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding remote ICE candidate:", err);
        }
      }
    });

    socket.on("participant-muted", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, isMuted: data.isMuted } : p));
    });

    socket.on("participant-camera-toggled", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, isVideoOff: data.isVideoOff } : p));
    });

    socket.on("participant-hand-raised", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, isHandRaised: data.isHandRaised } : p));
    });

    socket.on("participant-screen-shared", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, isSharingScreen: data.isSharingScreen } : p));
    });

    socket.on("reaction-received", (data) => {
      triggerReactionLocal(data.emoji);
    });

    socket.on("speaking-detected", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, audioLevel: data.level } : p));
      if (data.level > 15) {
        setActiveSpeakerId(data.sid);
      }
    });

    socket.on("chat-message-received", (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socket.on("notes-updated", (data) => {
      setMeetingNotes(data.notes);
    });

    socket.on("whiteboard-stroke-received", (data) => {
      drawStrokeOnCanvas(data.stroke);
    });

    socket.on("whiteboard-cleared", () => {
      clearCanvasLocal();
    });

    socket.on("file-shared-broadcast", (data) => {
      setSharedFiles(prev => [...prev, data]);
      setChatMessages(prev => [...prev, {
        id: "file-" + Date.now(),
        sender: data.sender,
        text: `Shared file: ${data.name} (${data.size})`,
        time: data.time,
        fileUrl: data.url
      }]);
    });

    socket.on("meeting-locked-toggled", (data) => {
      setLockMeeting(data.locked);
    });

    socket.on("waiting-room-toggled", (data) => {
      setWaitingRoomEnabled(data.enabled);
    });

    socket.on("join-request", (data) => {
      setJoinRequests(prev => {
        if (prev.find(r => r.id === data.sid)) return prev;
        return [...prev, { id: data.sid, name: data.name }];
      });
    });

    socket.on("permission-changed", (data) => {
      const { permission, value } = data;
      if (permission === "allowChat") setAllowChat(value);
      if (permission === "allowScreenShare") setAllowScreenShare(value);
      if (permission === "allowMic") setAllowMic(value);
      if (permission === "allowCamera") setAllowCamera(value);
    });

    socket.on("participant-role-changed", (data) => {
      setParticipants(prev => prev.map(p => p.id === data.sid ? { ...p, role: data.role } : p));
    });

    socket.on("force-mute-mic", () => {
      if (isMicOnRef.current) {
        setIsMicOn(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
        }
        socketRef.current?.emit("mute_toggle", { roomCode, isMuted: true });
      }
    });

    socket.on("ejected", (data) => {
      alert(data.reason);
      if (onLeave) onLeave();
    });

    socket.on("meeting-ended", () => {
      alert("This meeting was ended by the host.");
      setIsPostMeeting(true);
    });

    socket.on("recording-status-changed", (data) => {
      setRecState(data.status);
      setIsRecording(data.status === "recording");
    });

    socket.on("live-caption-received", async (data) => {
      setLiveCaptionSpeaker(data.speaker);
      setLiveCaptionText(data.text);
      
      const newTrans: TranscriptLine = {
        speaker: data.speaker,
        text: data.text,
        timestamp: new Date().toTimeString().slice(0, 5),
        detectedLanguage: data.language
      };

      if (selectedTranslationLangRef.current !== "none" && data.language !== selectedTranslationLangRef.current) {
        try {
          const res = await fetch("http://localhost:8000/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              text: data.text,
              target_lang: selectedTranslationLangRef.current
            })
          });
          if (res.ok) {
            const transData = await res.json();
            setLiveCaptionTranslation(transData.translatedText);
            newTrans.translation = transData.translatedText;
          }
        } catch (e) {
          console.warn("Live translation error:", e);
        }
      } else {
        setLiveCaptionTranslation("");
      }

      setTranscript(prev => [...prev, newTrans]);
    });

    return () => {
      socket.disconnect();
    };
  }, [localStream]);

  // Speaking Detection using Web Audio API
  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack || !isMicOn) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let intervalId: any = null;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const cleanStream = new MediaStream([audioTrack]);
      source = audioContext.createMediaStreamSource(cleanStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      intervalId = setInterval(() => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        if (average > 12) {
          socketRef.current?.emit("speaking_level", { roomCode, level: average });
          setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, audioLevel: average } : p));
        } else {
          setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, audioLevel: 0 } : p));
        }
      }, 200);
    } catch (e) {
      console.warn("Could not start speaking detection audio nodes:", e);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (source) source.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [localStream, isMicOn]);

  // Speech Recognition for live captions
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !isMicOn) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const resultText = event.results[event.results.length - 1][0].transcript.trim();
      if (resultText) {
        socketRef.current?.emit("send_live_caption", {
          roomCode,
          speaker: userName,
          text: resultText,
          language: "en"
        });
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech Recognition engine warning:", e);
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isMicOn]);

  // --- Network Telemetry ---
  useEffect(() => {
    const netTimer = setInterval(() => {
      const delta = Math.floor(Math.random() * 4) - 2;
      setLatency((prev) => {
        const val = Math.max(9, Math.min(26, prev + delta));
        if (val < 15) setNetworkQuality("excellent");
        else if (val < 22) setNetworkQuality("good");
        else setNetworkQuality("poor");
        return val;
      });
    }, 5000);
    return () => clearInterval(netTimer);
  }, []);

  // --- Live Recording Timer ---
  useEffect(() => {
    let timer: any;
    if (isRecording && recState === "recording") {
      timer = setInterval(() => {
        setRecTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, recState]);

  // --- Client-Side Composite stream capture ---
  useEffect(() => {
    if (recState === "recording" && localStream) {
      recordedChunksRef.current = [];
      try {
        const recorder = new MediaRecorder(localStream, { mimeType: "video/webm;codecs=vp9" });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = async () => {
          if (recordedChunksRef.current.length === 0) return;
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const file = new File([blob], `recording_${roomCode}.webm`, { type: "video/webm" });
          const formData = new FormData();
          formData.append("roomCode", roomCode);
          formData.append("file", file);
          try {
            await fetch("http://localhost:8000/api/recording/upload", {
              method: "POST",
              body: formData
            });
          } catch (e) {
            console.warn("Failed to upload WebM recording chunk:", e);
          }
        };
        recorder.start(1000);
      } catch (err) {
        console.warn("MediaRecorder setup failed:", err);
      }
    } else if (recState !== "recording") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
  }, [recState, localStream]);

  // --- Auto-scroll chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const triggerReactionLocal = (emoji: string) => {
    const id = "react-" + reactionIdCounter.current++;
    const newReaction: FlyingReaction = {
      id,
      emoji,
      left: Math.random() * 60 + 20,
      delay: 0
    };
    setFlyingReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setFlyingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);

    if (emoji === "❤️" || emoji === "🚀") {
      setMood("Excited");
      setTimeout(() => setMood("Focused"), 8000);
    }
  };

  const triggerReaction = (emoji: string) => {
    triggerReactionLocal(emoji);
    socketRef.current?.emit("reaction", { roomCode, emoji });
  };

  const simulateGesture = (gestureName: string) => {
    if (!gestureRecognitionEnabled) return;
    setLastDetectedGesture(gestureName);
    setTimeout(() => setLastDetectedGesture(null), 3000);

    switch (gestureName) {
      case "Thumbs Up":
        triggerReaction("👍");
        break;
      case "Peace Sign":
        toggleHandRaise();
        break;
      case "Wave":
        triggerReaction("👋");
        break;
      case "Double Palm":
        triggerReaction("👏");
        break;
      case "Finger Heart":
        triggerReaction("❤️");
        break;
      default:
        break;
    }
  };

  const simulateVoiceCommand = (command: string) => {
    if (!voiceCommandsEnabled) return;
    setLastVoiceCommand(command);
    setTimeout(() => setLastVoiceCommand(null), 3500);

    switch (command) {
      case "Mute Me":
        if (isMicOn) toggleMic();
        break;
      case "Unmute Me":
        if (!isMicOn) toggleMic();
        break;
      case "Turn Camera Off":
        if (isCamOn) toggleCam();
        break;
      case "Turn Camera On":
        if (!isCamOn) toggleCam();
        break;
      case "Share Screen":
        if (!isScreenSharing) toggleScreenShare();
        break;
      case "Stop Share":
        if (isScreenSharing) toggleScreenShare();
        break;
      default:
        break;
    }
  };

  const toggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    socketRef.current?.emit("mute_toggle", { roomCode, isMuted: !nextState });
    setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, isMuted: !nextState } : p));
  };

  const toggleCam = () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    socketRef.current?.emit("camera_toggle", { roomCode, isVideoOff: !nextState });
    setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, isVideoOff: !nextState } : p));
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      socketRef.current?.emit("screen_share_toggle", { roomCode, isSharingScreen: false });
      setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, isSharingScreen: false } : p));
      
      Object.keys(peersRef.current).forEach(sid => {
        const pc = peersRef.current[sid];
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender && localStreamRef.current) {
          const track = localStreamRef.current.getVideoTracks()[0];
          if (track) sender.replaceTrack(track);
        }
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        socketRef.current?.emit("screen_share_toggle", { roomCode, isSharingScreen: true });
        setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, isSharingScreen: true } : p));
        
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            toggleScreenShare();
          };
          Object.keys(peersRef.current).forEach(sid => {
            const pc = peersRef.current[sid];
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(track);
          });
        }
      } catch (err) {
        console.error("Screen sharing failed:", err);
      }
    }
  };

  const toggleHandRaise = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socketRef.current?.emit("hand_raise", { roomCode, isHandRaised: nextState });
    setParticipants(prev => prev.map(p => p.id === "you" ? { ...p, isHandRaised: nextState } : p));
  };

  // --- File Upload handler ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomCode", roomCode);
    formData.append("senderName", userName);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const fileData = await res.json();
        socketRef.current?.emit("file_shared", {
          roomCode,
          file: {
            name: fileData.name,
            size: fileData.size,
            sender: userName,
            time: new Date().toTimeString().slice(0, 5),
            url: `http://localhost:8000${fileData.url}`
          }
        });
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };

  // --- Chat handlers ---
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMsgText.trim()) return;

    const isCode = newMsgText.startsWith("```");
    const formattedText = isCode ? newMsgText.replace(/```[a-z]*\n?/g, "") : newMsgText;

    const newMsg: ChatMessage = {
      id: "c-my-" + Date.now(),
      sender: userName,
      text: formattedText,
      time: new Date().toTimeString().slice(0, 5),
      isMe: true,
      isCode
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setNewMsgText("");

    // Emit chat message over websocket
    socketRef.current?.emit("chat_message", {
      roomCode,
      text: formattedText,
      senderName: userName,
      isCode
    });
  };

  // --- Whiteboard Drawing Logic ---
  const drawStrokeOnCanvas = (stroke: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    
    ctx.beginPath();
    ctx.moveTo(stroke.startX, stroke.startY);
    ctx.lineTo(stroke.endX, stroke.endY);
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setWhiteboardFlowcharts([]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastXRef.current = e.clientX - rect.left;
    lastYRef.current = e.clientY - rect.top;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke = {
      startX: lastXRef.current,
      startY: lastYRef.current,
      endX: x,
      endY: y,
      color: drawingColor,
      width: lineWidth
    };

    drawStrokeOnCanvas(stroke);
    socketRef.current?.emit("whiteboard_stroke", { roomCode, stroke });

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    clearCanvasLocal();
    socketRef.current?.emit("whiteboard_clear", { roomCode });
  };

  const cleanToFlowchart = () => {
    const flowcharts = [
      { id: "fc-1", x: 60, y: 100, type: "process", label: "WebRTC Client Engine" },
      { id: "fc-2", x: 260, y: 100, type: "decision", label: "Is Low Bandwidth?" },
      { id: "fc-3", x: 480, y: 50, type: "process", label: "240p H.264 Fallback" },
      { id: "fc-4", x: 480, y: 150, type: "process", label: "4K VP9 Vector Stream" }
    ];
    setWhiteboardFlowcharts(flowcharts);
    flowcharts.forEach(fc => {
      socketRef.current?.emit("whiteboard_stroke", { roomCode, stroke: { type: "flowchart", box: fc } });
    });
  };

  // --- Poll Management ---
  const handleVote = (pollId: string, optIdx: number) => {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          const newOptions = [...poll.options];
          newOptions[optIdx] = { ...newOptions[optIdx], votes: newOptions[optIdx].votes + 1 };
          return { ...poll, options: newOptions, votedOptionIdx: optIdx };
        }
        return poll;
      })
    );
  };

  const createPoll = () => {
    if (!newPollQuestion.trim()) return;
    const activeOpts = newPollOptions.filter((opt) => opt.trim() !== "");
    if (activeOpts.length < 2) return;

    const newPoll: Poll = {
      id: "p-" + Date.now(),
      question: newPollQuestion,
      options: activeOpts.map((opt) => ({ text: opt, votes: 0 })),
      creator: "You"
    };

    setPolls((prev) => [...prev, newPoll]);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    triggerReaction("📊");
  };

  // --- AI Minutes Generative simulation ---
  const runSmartNoteify = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ roomCode })
      });
      if (res.ok) {
        const summaryData = await res.json();
        const formattedNotes = `${meetingNotes}\n\n## AI GENERATED MINUTES & SUMMARY (${new Date().toTimeString().slice(0, 5)})\n\n${summaryData.summary}\n\n- **Key Decisions**:\n` + summaryData.decisions.map((d: any) => `  - ${d.text}`).join("\n") + "\n\n- **Action Items**:\n" + summaryData.actionItems.map((a: any) => `  - ${a.text} (${a.assignee})`).join("\n");
        setMeetingNotes(formattedNotes);
        socketRef.current?.emit("notes_update", { roomCode, notes: formattedNotes });
        setActionItems(summaryData.actionItems);
        setDecisions(summaryData.decisions);
        triggerReactionLocal("✨");
      }
    } catch (err) {
      console.warn("Smart Noteify failed:", err);
    }
  };

  // --- Participant Simulation Controls (Dynamic grid demonstration) ---
  const addMockParticipant = () => {
    const id = "mock-" + Date.now();
    const names = ["Alice Sterling", "Devon Cole", "Ravi Nair", "Kenji Sato", "Sophia Lin", "Carlos Mendez"];
    const roles = ["Participant", "Co-Host"];
    const colors = [
      "from-orange-500 to-amber-400",
      "from-fuchsia-500 to-indigo-500",
      "from-blue-600 to-teal-400",
      "from-yellow-400 to-orange-500"
    ];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const newP: Participant = {
      id,
      name: `${randomName} (Sim)`,
      role: roles[Math.floor(Math.random() * roles.length)] as any,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      isMuted: Math.random() > 0.5,
      isVideoOff: Math.random() > 0.5,
      isSharingScreen: false,
      isHandRaised: false,
      isPinned: false,
      ping: Math.floor(Math.random() * 20) + 12,
      audioLevel: 0,
      language: "en"
    };

    setParticipants((prev) => [...prev, newP]);
  };

  const removeMockParticipant = () => {
    setParticipants((prev) => {
      if (prev.length <= 1) return prev;
      // Remove last added participant (non-you)
      const nonYou = prev.filter((p) => p.id !== "you");
      const targetId = nonYou[nonYou.length - 1].id;
      return prev.filter((p) => p.id !== targetId);
    });
  };

  // Sync personal camera and mute actions to participant status
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === "you"
          ? { ...p, isMuted: !isMicOn, isVideoOff: !isCamOn, isSharingScreen: isScreenSharing, isHandRaised }
          : p
      )
    );
  }, [isMicOn, isCamOn, isScreenSharing, isHandRaised]);

  // --- Calculations for Grid Layout CSS ---
  const gridLayoutClass = useMemo(() => {
    const count = participants.length;
    if (count === 1) return "grid-cols-1 max-w-2xl mx-auto aspect-video";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto aspect-video md:aspect-[21/9]";
    if (count <= 4) return "grid-cols-2 max-w-5xl mx-auto aspect-video";
    if (count <= 9) return "grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto aspect-video";
    return "grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto aspect-video overflow-y-auto max-h-[500px]";
  }, [participants]);

  // --- POST-MEETING ANALYTICS SIMULATION DATA ---
  const analyticsSummary = useMemo(() => {
    return {
      duration: "00:46:12",
      totalMembers: participants.length,
      averagePing: "16ms",
      encryption: "AES-256 (TLS 1.3)",
      moodBreakdown: { focused: 65, excited: 25, silent: 10 },
      healthScore: 94
    };
  }, [participants]);

  // --- RENDER POST-MEETING SUMMARY PORTAL ---
  if (isPostMeeting) {
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
              onClick={() => {
                setIsPostMeeting(false);
                setParticipants([
                  { id: "you", name: `You (${userName})`, role: "Organizer", avatarColor: "from-zinc-200 to-zinc-400", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 14, audioLevel: 0, language: "en" },
                  { id: "sophia", name: "Sophia Vance", role: "Co-Host", avatarColor: "from-indigo-500 to-cyan-400", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 18, audioLevel: 0, language: "en" },
                  { id: "liam", name: "Liam Drake", role: "Participant", avatarColor: "from-purple-600 to-pink-500", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 22, audioLevel: 0, language: "en" },
                  { id: "marcus", name: "Marcus Vance", role: "Participant", avatarColor: "from-amber-500 to-rose-500", isMuted: true, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 15, audioLevel: 0, language: "en" }
                ]);
                if (onLeave) onLeave();
              }}
              className="px-5 py-3 glass-pill text-xs font-semibold uppercase tracking-wider text-theme-text-primary hover:bg-theme-text-primary/10 rounded-xl transition-all cursor-pointer"
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
                        <li key={item.id} className="flex items-start gap-2.5">
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
                        <li key={dec.id} className="flex gap-2 text-theme-text-secondary leading-normal">
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
                  className="p-1 rounded hover:bg-theme-text-primary/5 text-theme-text-secondary hover:text-theme-text-primary"
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
              className="w-full py-3.5 glass-pill text-xs font-semibold uppercase tracking-wider text-theme-text-primary hover:bg-theme-text-primary/5 border border-theme-border rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Export Minutes of Meeting</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN MEETING ACTIVE ROOM VIEW ---
  return (
    <div className="relative w-full h-full max-w-none rounded-none border-none overflow-hidden flex flex-col text-left">
      
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
          {/* Recording Badge controls */}
          {(isRecording || participants.find(p => p.id === "you")?.role === "Organizer") && (
            <button
              onClick={() => {
                const isOrg = participants.find(p => p.id === "you")?.role === "Organizer";
                if (!isOrg) return;
                const nextStatus = recState === "recording" ? "idle" : "recording";
                socketRef.current?.emit("recording_status_toggle", { roomCode, status: nextStatus });
              }}
              className={`flex items-center gap-2 px-2.5 py-1 rounded border outline-none select-none ${
                recState === "recording"
                  ? "bg-red-950/20 border-red-900/35 text-red-500 dark:text-red-300 animate-pulse cursor-pointer"
                  : "bg-theme-border/20 border-theme-border/30 text-theme-text-muted hover:text-theme-text-primary cursor-pointer"
              }`}
              title={participants.find(p => p.id === "you")?.role === "Organizer" ? "Toggle Session Recording" : "Recording status indicator"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${recState === "recording" ? "bg-red-500" : "bg-zinc-500"}`} />
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase">
                {recState === "recording" ? `REC ${formatTime(recTime)}` : "START REC"}
              </span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-theme-border/20 border border-theme-border/30 font-mono text-[9px] text-theme-text-muted">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>MOOD: <span className="text-theme-text-primary font-bold">{mood}</span></span>
          </div>
        </div>

        {/* Right Section: Telemetry, Latency & User Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-theme-text-secondary select-none" title="WebSocket Network Latency">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>{latency}ms</span>
            <span className="text-[8px] text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.2 rounded uppercase">HQ</span>
          </div>

          <div className="h-4 w-px bg-theme-border/30" />

          {/* User profile capsule */}
          <div className="flex items-center gap-2 cursor-pointer" title="Your Settings">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-400 flex items-center justify-center text-[10px] font-bold text-black border border-theme-border/30">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-theme-text-primary truncate max-w-[80px]">
              {userName}
            </span>
          </div>

          {/* Simulation Toggle Option */}
          <button
            onClick={() => setShowSimPanel(!showSimPanel)}
            className={`p-1.5 rounded border transition-colors outline-none cursor-pointer ${showSimPanel ? 'bg-theme-text-primary text-theme-bg border-transparent' : 'bg-theme-text-primary/5 border-theme-border text-theme-text-secondary hover:text-theme-text-primary'}`}
            title="Lobby/Simulator Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Simulation Workspace (Floating Top) */}
      <AnimatePresence>
        {showSimPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-theme-surface border-b border-theme-border/30 px-5 py-4 flex flex-wrap gap-4 items-center justify-between text-xs"
          >
            <div className="flex flex-col gap-1 text-left">
              <span className="font-mono text-[10px] uppercase text-theme-text-muted tracking-wider">
                Developer Simulation Controls
              </span>
              <p className="text-[10px] text-theme-text-secondary font-light">
                Inspect grid scaling, hand gestures, and voice commands easily.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Participant layout mock triggers */}
              <button
                onClick={addMockParticipant}
                className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-primary hover:bg-theme-text-primary/10 border-theme-border"
              >
                + Mock Member
              </button>
              <button
                onClick={removeMockParticipant}
                className="px-3 py-1.5 glass-pill rounded-lg text-[10px] font-semibold text-theme-text-primary hover:bg-theme-text-primary/10 border-theme-border"
              >
                - Remove Member
              </button>

              <div className="w-px h-5 bg-theme-border/30 my-auto" />

              {/* Hand gestures */}
              <div className="flex items-center gap-1 bg-theme-border/20 px-2 py-1 rounded-lg">
                <span className="text-[9px] font-mono uppercase text-theme-text-muted mr-1.5">Gestures:</span>
                {["Thumbs Up", "Peace Sign", "Wave", "Double Palm", "Finger Heart"].map((gst) => (
                  <button
                    key={gst}
                    onClick={() => simulateGesture(gst)}
                    className="px-2 py-1 bg-theme-bg hover:bg-theme-elevated text-[9px] font-medium text-theme-text-secondary rounded border border-theme-border"
                  >
                    {gst}
                  </button>
                ))}
              </div>

              {/* Voice commands */}
              <div className="flex items-center gap-1 bg-theme-border/20 px-2 py-1 rounded-lg">
                <span className="text-[9px] font-mono uppercase text-theme-text-muted mr-1.5">Voice Commands:</span>
                {["Mute Me", "Unmute Me", "Turn Camera Off", "Share Screen", "Stop Share"].map((vc) => (
                  <button
                    key={vc}
                    onClick={() => simulateVoiceCommand(vc)}
                    className="px-2 py-1 bg-theme-bg hover:bg-theme-elevated text-[9px] font-medium text-theme-text-secondary rounded border border-theme-border"
                  >
                    "{vc}"
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body Matrix: Adaptive Video Grid + Sidebar (if open) */}
      <div className="flex-1 flex flex-col lg:flex-row relative min-h-0 overflow-hidden">
        
        {/* Left Side: Adaptive Video Grid and Subtitle Overlay */}
        <div className="flex-1 flex flex-col p-4 bg-gradient-to-b from-transparent to-theme-bg/10 overflow-y-auto">
          
          {/* Main Adaptive Video Grid */}
          <div className="flex-1 flex flex-col justify-center">
            <div className={`grid gap-4 w-full transition-all duration-500 ease-in-out ${gridLayoutClass}`}>
              <AnimatePresence mode="popLayout">
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
                      {/* Ambient Glowing speaker standard */}
                      {isActiveSpeaker && (
                        <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
                      )}

                      {/* Video Card Header: Name & badges */}
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

                        {/* Hand raised status */}
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

                      {/* Video Feed or Screenshare rendering */}
                      <div className="flex-1 flex items-center justify-center relative my-2 overflow-hidden rounded-xl bg-theme-bg/30 border border-theme-border/10">
                        {p.isVideoOff && !p.isSharingScreen ? (
                          // Large Avatar fallback
                          <div className="relative">
                            {/* Speaking aura ripples */}
                            {isActiveSpeaker && p.audioLevel > 0 && (
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-[-10px] rounded-full border border-theme-border/30 pointer-events-none"
                              />
                            )}

                            <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-xl font-bold text-black border border-theme-border/30`}>
                              {p.name.charAt(0)}
                            </div>
                          </div>
                        ) : (
                          // Real WebRTC Video Tag Stream
                          <VideoStream
                            stream={p.id === "you" ? (isScreenSharing ? screenStreamRef.current : localStream) : peerStreams[p.id]}
                            muted={p.id === "you"}
                          />
                        )}
                      </div>

                      {/* Video Card Footer Info and Hover Actions */}
                      <div className="flex justify-between items-center z-10">
                        {/* Audio visual level indicators */}
                        <div className="flex items-center gap-1.5">
                          {p.isMuted ? (
                            <MicOff className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <div className="flex items-center gap-0.5 h-3 select-none">
                              {[1, 2, 3].map((bar) => (
                                <div
                                  key={bar}
                                  className={`w-0.5 rounded bg-emerald-500 transition-all ${
                                    isActiveSpeaker && p.audioLevel > 0
                                      ? "h-3 animate-pulse"
                                      : "h-1"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          <span className="font-mono text-[9px] text-theme-text-muted">{p.ping}ms</span>
                        </div>

                        {/* Card Hover Options */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => setPinnedSpeakerId(isPinned ? null : p.id)}
                            className="p-1 rounded bg-theme-bg/60 border border-theme-border/20 text-theme-text-secondary hover:text-theme-text-primary text-[10px]"
                            title="Pin Video Stream"
                          >
                            <Layout className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => alert(`Showing profiles for ${p.name}`)}
                            className="p-1 rounded bg-theme-bg/60 border border-theme-border/20 text-theme-text-secondary hover:text-theme-text-primary text-[10px]"
                            title="View Profile Details"
                          >
                            <Users className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Subtitles & Live Caption Overlay */}
          {liveCaptionText && (
            <div className="mt-4 glass-panel rounded-xl p-3.5 flex items-start gap-3 border-transparent hover:bg-theme-surface/30 transition-all max-w-4xl mx-auto w-full">
              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 animate-pulse shrink-0" />
              <div className="flex-1 text-left">
                <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 block mb-0.5">
                  Live Caption & Translation
                </span>
                <p className="text-xs text-theme-text-secondary leading-relaxed font-sans italic">
                  <span className="font-semibold text-theme-text-primary not-italic mr-1.5">
                    {liveCaptionSpeaker}:
                  </span>
                  "{liveCaptionText}"
                </p>

                {liveCaptionTranslation && (
                  <p className="text-xs text-cyan-400 mt-1 font-sans leading-relaxed border-t border-theme-border/10 pt-1">
                    Translate to {selectedTranslationLang.toUpperCase()}: "{liveCaptionTranslation}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Panels */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-theme-border/20 flex flex-col bg-theme-bg/10 max-h-[640px]"
            >
              {/* Sidebar Header Tab Selectors */}
              <div className="flex border-b border-theme-border/20 bg-theme-surface/40 p-2 overflow-x-auto gap-1">
                {[
                  { id: "chat", label: "Chat", icon: MessageSquare },
                  { id: "members", label: "Members", icon: Users },
                  { id: "ai", label: "AI", icon: Brain },
                  { id: "notes", label: "Notes", icon: FileText },
                  { id: "polls", label: "Polls", icon: BarChart2 },
                  { id: "files", label: "Files", icon: Paperclip },
                  { id: "whiteboard", label: "Whiteboard", icon: Edit3 }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors outline-none cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-theme-text-primary text-theme-bg font-semibold"
                          : "text-theme-text-secondary hover:bg-theme-text-primary/5 hover:text-theme-text-primary"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sidebar Content Switchboard */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-[300px]">
                
                {/* 1. MEMBERS LIST PANEL */}
                {activeTab === "members" && (
                  <div className="flex flex-col gap-4 text-left">
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
                                onClick={() => setJoinRequests([])}
                                className="px-2 py-1 bg-theme-text-primary text-theme-bg rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Admit
                              </button>
                              <button
                                onClick={() => setJoinRequests([])}
                                className="px-2 py-1 border border-theme-border hover:bg-theme-text-primary/5 rounded text-[10px] text-theme-text-secondary cursor-pointer"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {participants.map((p) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-theme-surface/40 hover:bg-theme-surface/65 border border-theme-border/20 flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center text-[10px] font-bold text-black border border-theme-border/30`}>
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-theme-text-primary truncate max-w-[120px]">{p.name}</span>
                              <span className="text-[9px] font-mono text-theme-text-muted uppercase mt-0.5">{p.role}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Mute toggle option */}
                            <button
                              onClick={() => {
                                setParticipants((prev) =>
                                  prev.map((memb) =>
                                    memb.id === p.id ? { ...memb, isMuted: !memb.isMuted } : memb
                                  )
                                );
                              }}
                              className={`p-1.5 rounded hover:bg-theme-text-primary/10 transition-colors cursor-pointer ${p.isMuted ? 'text-red-500' : 'text-theme-text-secondary/70'}`}
                              title={p.isMuted ? "Unmute Participant" : "Mute Participant"}
                            >
                              {p.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                            </button>

                            {/* Remove button */}
                            {p.id !== "you" && (
                              <button
                                onClick={() => {
                                  setParticipants((prev) => prev.filter((memb) => memb.id !== p.id));
                                }}
                                className="p-1.5 rounded hover:bg-red-500/10 text-theme-text-secondary/50 hover:text-red-500 transition-colors cursor-pointer"
                                title="Remove Participant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CHAT STREAM PANEL */}
                {activeTab === "chat" && (
                  <div className="flex-1 flex flex-col gap-3 h-full justify-between">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-2">
                      <span>Secure Chat Feed</span>
                      <button
                        onClick={() => {
                          // Collapse chat to AI notes summary!
                          const chatTexts = chatMessages.map((m) => `${m.sender}: ${m.text}`).join("\n");
                          setMeetingNotes((prev) => `${prev}\n\n## CHAT SUMMARY\n${chatTexts}`);
                          alert("AI chat logs summarized to Notes tab!");
                        }}
                        className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                        title="AI Summarize Chat Logs"
                      >
                        AI Summary
                      </button>
                    </div>

                    {/* Messages container */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col p-2.5 rounded-xl border leading-relaxed text-xs ${
                            msg.isMe
                              ? "bg-theme-text-primary/5 border-theme-border/30 ml-6"
                              : "bg-theme-surface/40 border-theme-border/20 mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 border-b border-theme-border/5 pb-1">
                            <span className="font-semibold text-theme-text-primary text-[11px] truncate max-w-[120px]">
                              {msg.sender}
                            </span>
                            <span className="text-[9px] font-mono text-theme-text-muted">{msg.time}</span>
                          </div>

                          {msg.isCode ? (
                            <pre className="p-2 bg-black/60 rounded font-mono text-[9px] text-emerald-400 overflow-x-auto">
                              <code>{msg.text}</code>
                            </pre>
                          ) : (
                            <p className="text-theme-text-secondary text-[11px] leading-normal">{msg.text}</p>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Form field */}
                    <form onSubmit={handleSendChat} className="flex gap-2 border-t border-theme-border/25 pt-2">
                      <input
                        type="text"
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        placeholder="Type message, use @AI..."
                        className="flex-1 bg-theme-text-primary/5 hover:bg-theme-text-primary/8 focus:bg-theme-text-primary/10 border border-theme-border/45 focus:border-theme-text-primary/30 rounded-lg px-3 py-2 text-xs text-theme-text-primary placeholder-theme-text-muted/40 outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        className="p-2 bg-theme-text-primary hover:opacity-90 text-theme-bg rounded-lg transition-colors flex items-center justify-center cursor-pointer outline-none"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. AI TRANSCRIBER & ASSISTANT PANEL */}
                {activeTab === "ai" && (
                  <div className="flex flex-col gap-5 text-left text-xs font-sans">
                    {/* Live transcripts feed */}
                    <div className="flex flex-col gap-2">
                      <span className="font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1 block">
                        Live Transcription Log
                      </span>
                      <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 bg-theme-bg/30 p-2.5 rounded-xl border border-theme-border/25">
                        {transcript.map((line, idx) => (
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
                        ))}
                      </div>
                    </div>

                    {/* Detected Actions and Timeline */}
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
                            {actionItems.slice(0, 2).map((a, i) => (
                              <li key={i} className="flex gap-1.5">
                                <span className="text-pink-500 font-bold shrink-0">•</span>
                                <span>{a.text} ({a.assignee})</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-xl border border-theme-border/20 bg-theme-surface/50">
                          <span className="font-semibold text-theme-text-primary font-mono text-[10px] block mb-1">
                            Decisions Registered:
                          </span>
                          <ul className="space-y-1.5 text-[11px] text-theme-text-secondary">
                            {decisions.map((d, i) => (
                              <li key={i} className="flex gap-1.5">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span>{d.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const momText = `MINUTES OF MEETING\n\n- Project Duration: 46m\n- Presenters: Sophia, Liam, Marcus\n\n- Decisions resolved: Socket.IO Router, AES-256 Client Encryptions.`;
                          alert("AI minutes generated and appended to Notes tab!");
                          setMeetingNotes((prev) => `${prev}\n\n${momText}`);
                        }}
                        className="w-full py-2.5 bg-theme-text-primary text-theme-bg font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono text-[10px] tracking-wider"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        <span>Generate MOM Minutes</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. MEETING NOTES WORKSPACE */}
                {activeTab === "notes" && (
                  <div className="flex-1 flex flex-col gap-3 h-full justify-between text-left">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
                      <span>Shared Workspace Notes</span>
                      <button
                        onClick={runSmartNoteify}
                        className="text-[9px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                        title="AI Summarize Transcript to Notes"
                      >
                        <Sparkle className="w-3 h-3" />
                        <span>Smart Noteify</span>
                      </button>
                    </div>

                    <textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      className="flex-1 bg-theme-text-primary/5 border border-theme-border/20 rounded-xl p-3 font-mono text-[10.5px] text-theme-text-secondary placeholder-theme-text-muted/40 focus:border-theme-text-primary/30 outline-none resize-none leading-relaxed min-h-[300px]"
                    />
                  </div>
                )}

                {/* 5. ACTIVE POLLS PANEL */}
                {activeTab === "polls" && (
                  <div className="flex flex-col gap-4 text-left">
                    <span className="font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1">
                      Active Workspace Polls
                    </span>

                    {/* Poll list */}
                    <div className="flex flex-col gap-4 max-h-[220px] overflow-y-auto pr-1">
                      {polls.map((poll) => {
                        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

                        return (
                          <div key={poll.id} className="p-3 bg-theme-surface/50 border border-theme-border/25 rounded-xl flex flex-col gap-2">
                            <h4 className="text-xs font-semibold text-theme-text-primary leading-normal">{poll.question}</h4>
                            <span className="text-[9px] text-theme-text-muted font-mono block">By {poll.creator}</span>
                            
                            <div className="flex flex-col gap-2 mt-1">
                              {poll.options.map((opt, optIdx) => {
                                const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                const isVoted = poll.votedOptionIdx === optIdx;

                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => poll.votedOptionIdx === undefined && handleVote(poll.id, optIdx)}
                                    className={`relative p-2 rounded-lg border text-[11px] leading-normal transition-all ${
                                      poll.votedOptionIdx === undefined ? 'cursor-pointer hover:bg-theme-text-primary/5' : ''
                                    } ${isVoted ? 'border-cyan-500 bg-cyan-950/15' : 'border-theme-border/15 bg-theme-bg/30'}`}
                                  >
                                    {/* Percent fill bar */}
                                    <div
                                      className="absolute left-0 top-0 bottom-0 bg-theme-text-primary/5 transition-all rounded-lg"
                                      style={{ width: `${percent}%` }}
                                    />
                                    
                                    <div className="relative flex justify-between z-10">
                                      <span>{opt.text}</span>
                                      <span className="font-mono font-semibold text-theme-text-primary">{percent}% ({opt.votes})</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Create new Poll Creator form */}
                    <div className="border-t border-theme-border/25 pt-3 mt-1 flex flex-col gap-3">
                      <span className="font-mono text-[9px] uppercase text-cyan-400 font-bold tracking-wider">
                        Create Meeting Poll
                      </span>
                      <input
                        type="text"
                        placeholder="Poll Question?"
                        value={newPollQuestion}
                        onChange={(e) => setNewPollQuestion(e.target.value)}
                        className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-2 text-xs text-theme-text-primary outline-none"
                      />
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Option 1"
                          value={newPollOptions[0]}
                          onChange={(e) => {
                            const clone = [...newPollOptions];
                            clone[0] = e.target.value;
                            setNewPollOptions(clone);
                          }}
                          className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-primary outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Option 2"
                          value={newPollOptions[1]}
                          onChange={(e) => {
                            const clone = [...newPollOptions];
                            clone[1] = e.target.value;
                            setNewPollOptions(clone);
                          }}
                          className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-primary outline-none"
                        />
                      </div>
                      <button
                        onClick={createPoll}
                        className="py-2 bg-theme-text-primary text-theme-bg font-semibold rounded-lg hover:opacity-90 transition-opacity text-[10px] uppercase font-mono tracking-wider cursor-pointer"
                      >
                        Deploy Poll
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. SHARED FILES TAB */}
                {activeTab === "files" && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex justify-between items-center font-mono text-[10px] uppercase text-theme-text-muted">
                      <span>Shared Documents</span>
                      <span>Count: {sharedFiles.length}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {sharedFiles.map((f, i) => (
                        <div key={i} className="p-3 bg-theme-surface/50 border border-theme-border/20 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <div className="flex flex-col">
                              <span className="text-theme-text-primary font-medium truncate max-w-[130px]" title={f.name}>
                                {f.name}
                              </span>
                              <span className="text-[9px] font-mono text-theme-text-muted">
                                {f.size} • {f.sender}
                              </span>
                            </div>
                          </div>
                          
                          <a
                            href={f.fileUrl}
                            download={f.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-theme-text-primary/10 text-theme-text-secondary hover:text-theme-text-primary cursor-pointer animate-fade-in"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-theme-border hover:border-theme-text-primary transition-colors py-6 text-center rounded-xl cursor-pointer bg-theme-bg/20 flex flex-col items-center justify-center gap-1.5"
                    >
                      <Paperclip className="w-5 h-5 text-theme-text-muted" />
                      <span className="text-[10px] text-theme-text-secondary font-medium">Click to upload document file</span>
                      <span className="text-[8px] font-mono text-theme-text-muted">Max size: 100MB</span>
                    </div>
                  </div>
                )}

                {/* 7. AI WHITEBOARD CANVAS */}
                {activeTab === "whiteboard" && (
                  <div className="flex-1 flex flex-col gap-3 h-full justify-between text-left relative">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
                      <span>AI Diagram Canvas</span>
                      <div className="flex gap-2">
                        <button
                          onClick={cleanToFlowchart}
                          className="text-[9px] text-cyan-400 hover:underline cursor-pointer font-bold uppercase tracking-wider"
                          title="Generate flow diagram blocks from sketch lines"
                        >
                          Clean Diagram
                        </button>
                        <button
                          onClick={clearWhiteboard}
                          className="text-[9px] text-red-500 hover:underline cursor-pointer font-bold uppercase tracking-wider"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Colors and brush width options */}
                    <div className="flex items-center justify-between bg-theme-surface/50 border border-theme-border/20 px-2 py-1.5 rounded-lg text-[9px] gap-2">
                      <div className="flex gap-1">
                        {["#FFFFFF", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"].map((c) => (
                          <span
                            key={c}
                            onClick={() => setDrawingColor(c)}
                            className="w-3.5 h-3.5 rounded-full border cursor-pointer block"
                            style={{ backgroundColor: c, borderColor: drawingColor === c ? "#FFFFFF" : "transparent" }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-theme-text-secondary">
                        <span>Brush:</span>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(Number(e.target.value))}
                          className="w-16 accent-theme-text-primary"
                        />
                      </div>
                    </div>

                    {/* Canvas drawing container */}
                    <div className="flex-1 relative rounded-xl border border-theme-border bg-black/40 overflow-hidden min-h-[220px]">
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={250}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="absolute inset-0 cursor-crosshair"
                      />

                      {/* Clean flowchart overlays overlaying coordinates */}
                      {whiteboardFlowcharts.map((box) => (
                        <div
                          key={box.id}
                          style={{ left: box.x, top: box.y }}
                          className={`absolute p-2 border text-[8px] font-mono rounded shadow bg-theme-bg/90 select-none z-10 max-w-[80px] text-center leading-tight ${
                            box.type === "decision" ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400"
                          }`}
                        >
                          {box.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Reaction Animation Overlay Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        <AnimatePresence>
          {flyingReactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "100%", opacity: 1, scale: 0.8 }}
              animate={{ y: "15%", opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              style={{ left: `${r.left}%` }}
              className="absolute text-3xl select-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dynamic Gesture Feedback Badge */}
      <AnimatePresence>
        {lastDetectedGesture && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-24 left-10 z-40 px-3.5 py-2 glass-panel-heavy border-theme-border/40 text-xs text-cyan-400 flex items-center gap-2 rounded-full font-mono select-none uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>AI GESTURE: {lastDetectedGesture} DETECTED</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Voice Feedback Badge */}
      <AnimatePresence>
        {lastVoiceCommand && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 rounded-full font-mono select-none uppercase tracking-wider"
          >
            <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>VOICE COMMAND: "{lastVoiceCommand}" DETECTED</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Control Dock (Glassmorphism layout) */}
      <div className="px-5 py-4 border-t border-theme-border/30 flex flex-wrap items-center justify-between bg-theme-bg/40 gap-4">
        
        {/* Left Side indicators */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-theme-text-muted">
          <span>SPEAKER FOCUS:</span>
          <span className="text-theme-text-primary font-bold">
            {participants.find((p) => p.id === activeSpeakerId)?.name || "System Core"}
          </span>
        </div>

        {/* Center Panel: Main Dock Controls */}
        <div className="flex items-center gap-3.5 mx-auto sm:mx-0 relative">
          {/* Mute Mic button */}
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isMicOn
                ? "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 animate-pulse"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
 
          {/* Toggle Camera */}
          <button
            onClick={toggleCam}
            className={`p-3 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isCamOn
                ? "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
                : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
            }`}
            title={isCamOn ? "Disable Web Camera" : "Enable Web Camera"}
          >
            {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
 
          {/* Toggle Share screen */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isScreenSharing
                ? "bg-theme-text-primary text-theme-bg border-transparent shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                : "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen Stream"}
          >
            <MonitorUp className="w-4 h-4" />
          </button>
 
          {/* Hand raise */}
          <button
            onClick={toggleHandRaise}
            className={`p-3 rounded-full border cursor-pointer transition-all duration-300 outline-none ${
              isHandRaised
                ? "bg-amber-500 text-black border-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-bounce"
                : "bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10"
            }`}
            title={isHandRaised ? "Lower Hand" : "Raise Hand"}
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Emojis trigger reaction menu */}
          <div className="relative group">
            <button
              className="p-3 rounded-full bg-theme-text-primary/5 border border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10 cursor-pointer outline-none"
              title="React Emojis"
            >
              <Smile className="w-4 h-4" />
            </button>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-theme-elevated border border-theme-border p-2.5 rounded-xl gap-2 shadow-2xl items-center z-50">
              {["👍", "👏", "❤️", "🚀", "🔥", "🎉", "😮", "👋"].map((emj) => (
                <button
                  key={emj}
                  onClick={() => triggerReaction(emj)}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer"
                >
                  {emj}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-theme-border/30 mx-1" />

          {/* Sidebar toggler */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-3 rounded-full border cursor-pointer transition-colors outline-none ${
              isSidebarOpen ? 'bg-theme-text-primary text-theme-bg border-transparent' : 'bg-theme-text-primary/5 border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10'
            }`}
            title="Toggle Right Sidebar Workspace"
          >
            <Layout className="w-4 h-4" />
          </button>

          {/* Options Dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              className="p-3 rounded-full bg-theme-text-primary/5 border border-theme-border text-theme-text-primary hover:bg-theme-text-primary/10 cursor-pointer outline-none"
              title="More Options Settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {/* Options Dropdown list */}
            <AnimatePresence>
              {showOptionsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-14 right-0 w-64 bg-theme-elevated border border-theme-border rounded-xl p-3 shadow-2xl flex flex-col gap-3 z-50 text-xs text-left"
                >
                  <span className="font-mono text-[9px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1">
                    Smart Stream Settings
                  </span>

                  <button
                    onClick={() => {
                      setShowBgEffectsModal(true);
                      setShowOptionsDropdown(false);
                    }}
                    className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-theme-text-primary/5 rounded-lg text-theme-text-secondary hover:text-theme-text-primary cursor-pointer"
                  >
                    <Image className="w-4 h-4" />
                    <span>Background Effects</span>
                  </button>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-theme-text-secondary">AI Noise Removal</span>
                    <input
                      type="checkbox"
                      checked={isNoiseCancelled}
                      onChange={() => setIsNoiseCancelled(!isNoiseCancelled)}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-theme-text-secondary">Live Gestures AI</span>
                    <input
                      type="checkbox"
                      checked={gestureRecognitionEnabled}
                      onChange={() => setGestureRecognitionEnabled(!gestureRecognitionEnabled)}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-theme-text-secondary">Voice Command Listen</span>
                    <input
                      type="checkbox"
                      checked={voiceCommandsEnabled}
                      onChange={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="h-px bg-theme-border/15 my-1" />

                  {/* Translation language */}
                  <div className="flex flex-col gap-1.5 px-2">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-theme-text-muted flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5" />
                      <span>Live Translation Engine</span>
                    </span>
                    <select
                      value={selectedTranslationLang}
                      onChange={(e: any) => setSelectedTranslationLang(e.target.value)}
                      className="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none"
                    >
                      <option value="none">Disabled</option>
                      <option value="ja">Japanese (日本語)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                    </select>
                  </div>

                  <div className="h-px bg-theme-border/15 my-1" />

                  {/* Host Panel Access */}
                  <button
                    onClick={() => {
                      setShowHostModal(true);
                      setShowOptionsDropdown(false);
                    }}
                    className="flex items-center gap-2.5 py-1.5 px-2 bg-theme-text-primary/5 hover:bg-theme-text-primary/10 rounded-lg text-theme-text-primary cursor-pointer border border-theme-border/30"
                  >
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Organizer Dashboard</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-theme-border/30 mx-1" />

          {/* Leave Button */}
          <button
            onClick={() => {
              if (onLeave) onLeave();
            }}
            className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 cursor-pointer outline-none"
          >
            Leave
          </button>
        </div>

        {/* Right Side: Host-specific Actions (Direct exit trigger) */}
        <div className="hidden sm:block">
          <button
            onClick={() => {
              const isOrganizer = participants.find(p => p.id === "you")?.role === "Organizer";
              if (isOrganizer) {
                if (confirm("End this meeting for everyone?")) {
                  socketRef.current?.emit("host_end_meeting", { roomCode });
                }
              } else {
                if (onLeave) onLeave();
              }
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer outline-none shadow-lg"
            title="Terminate node session for all channels"
          >
            End Session
          </button>
        </div>
      </div>

      {/* --- BACKGROUND EFFECTS SELECTOR MODAL --- */}
      <AnimatePresence>
        {showBgEffectsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowBgEffectsModal(false)} className="absolute inset-0 bg-[#0B0B0B]/80 backdrop-blur-sm" />
            <div className="glass-panel-heavy rounded-2xl border border-theme-border/40 p-6 w-full max-w-md shadow-2xl relative z-10 text-left">
              <button
                onClick={() => setShowBgEffectsModal(false)}
                className="absolute top-4 right-4 text-theme-text-secondary hover:text-theme-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-display font-semibold text-sm tracking-wider uppercase text-theme-text-primary mb-1">
                Virtual Video Backgrounds
              </h3>
              <p className="text-[11px] text-theme-text-secondary mb-4 font-light">
                Configure your video backdrop using AI matrix shaders and blur coefficients.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: "none", label: "No Effect", bg: "bg-theme-bg" },
                  { id: "blur", label: "Gaussian Blur", bg: "bg-gradient-to-r from-zinc-600 to-zinc-800 backdrop-blur-xl" },
                  { id: "matrix", label: "Digital Matrix", bg: "bg-gradient-to-tr from-emerald-950 to-green-900 border border-green-500/20" },
                  { id: "cyberpunk", label: "Cyberpunk Neon Grid", bg: "bg-gradient-to-tr from-fuchsia-950 to-pink-900 border border-pink-500/20" },
                  { id: "tokyo", label: "Neo Tokyo Streets", bg: "bg-gradient-to-tr from-blue-950 to-indigo-900 border border-indigo-500/20" }
                ].map((eff) => (
                  <div
                    key={eff.id}
                    onClick={() => {
                      setActiveBgEffect(eff.id as any);
                      alert(`Applying backdrop layer: ${eff.label}`);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between aspect-video transition-all ${
                      activeBgEffect === eff.id
                        ? "border-white bg-theme-surface shadow-lg"
                        : "border-theme-border/30 bg-theme-surface/50 hover:bg-theme-surface"
                    }`}
                  >
                    <div className={`w-full h-10 rounded-lg ${eff.bg}`} />
                    <span className="text-[10px] font-semibold text-theme-text-primary block mt-1.5">{eff.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBgEffectsModal(false)}
                  className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary rounded-xl hover:opacity-90 cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HOST/ORGANIZER SETTINGS MODAL --- */}
      <AnimatePresence>
        {showHostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowHostModal(false)} className="absolute inset-0 bg-[#0B0B0B]/85 backdrop-blur-sm" />
            <div className="glass-panel-heavy rounded-2xl border border-theme-border/40 p-6 w-full max-w-lg shadow-2xl relative z-10 text-left">
              <button
                onClick={() => setShowHostModal(false)}
                className="absolute top-4 right-4 text-theme-text-secondary hover:text-theme-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-semibold text-sm tracking-wider uppercase text-theme-text-primary">
                  Host Controls Dashboard
                </h3>
              </div>
              <p className="text-[11px] text-theme-text-secondary mb-6 font-light">
                Configure global node properties, lock status, and participant permissions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-xs text-theme-text-secondary leading-normal">
                {/* Left col - Permissions */}
                <div className="flex flex-col gap-3.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-theme-text-muted border-b border-theme-border/10 pb-1 font-bold">
                    Global Permissions
                  </span>

                  <div className="flex items-center justify-between">
                    <span>Lock Conference Room</span>
                    <input
                      type="checkbox"
                      checked={lockMeeting}
                      onChange={() => {
                        const next = !lockMeeting;
                        setLockMeeting(next);
                        socketRef.current?.emit("host_lock_meeting", { roomCode, locked: next });
                      }}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Admit Waiting Room</span>
                    <input
                      type="checkbox"
                      checked={waitingRoomEnabled}
                      onChange={() => {
                        const next = !waitingRoomEnabled;
                        setWaitingRoomEnabled(next);
                        socketRef.current?.emit("host_waiting_room_toggle", { roomCode, enabled: next });
                      }}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Allow Screen Sharing</span>
                    <input
                      type="checkbox"
                      checked={allowScreenShare}
                      onChange={() => {
                        const next = !allowScreenShare;
                        setAllowScreenShare(next);
                        socketRef.current?.emit("host_permission_toggle", { roomCode, permission: "allowScreenShare", value: next });
                      }}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Allow Text Chat</span>
                    <input
                      type="checkbox"
                      checked={allowChat}
                      onChange={() => {
                        const next = !allowChat;
                        setAllowChat(next);
                        socketRef.current?.emit("host_permission_toggle", { roomCode, permission: "allowChat", value: next });
                      }}
                      className="accent-theme-text-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right col - Actions & Settings */}
                <div className="flex flex-col gap-3.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-theme-text-muted border-b border-theme-border/10 pb-1 font-bold">
                    Broadcast Options
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        socketRef.current?.emit("host_mute_all", { roomCode });
                        alert("Mute broadcast sent to all participants.");
                      }}
                      className="flex-1 py-2 border border-theme-border hover:bg-theme-text-primary/5 rounded-lg font-mono text-[9px] uppercase tracking-wider text-theme-text-primary cursor-pointer"
                    >
                      Mute Everyone
                    </button>
                    <button
                      onClick={() => {
                        alert("Live streaming pipeline connected (Mock RTMP).");
                      }}
                      className="flex-1 py-2 border border-theme-border hover:bg-theme-text-primary/5 rounded-lg font-mono text-[9px] uppercase tracking-wider text-theme-text-primary cursor-pointer"
                    >
                      Start Stream
                    </button>
                  </div>

                  {/* Password configurator */}
                  <div className="flex flex-col gap-1.5">
                    <span>Conference Passkey</span>
                    <input
                      type="text"
                      readOnly
                      value="NEX-794-ENCRYPTED-AES"
                      className="bg-theme-bg border border-theme-border text-theme-text-primary font-mono text-[10px] rounded px-2.5 py-1.5 outline-none select-all"
                    />
                  </div>

                  {/* Attendance file */}
                  <button
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,"
                        + ["Name,Role,Muted,CameraOff"].join(",") + "\n"
                        + participants.map(p => `"${p.name}","${p.role}",${p.isMuted},${p.isVideoOff}`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `attendance_${roomCode}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full py-2 bg-theme-text-primary/5 hover:bg-theme-text-primary/10 border border-theme-border/30 rounded-lg font-mono text-[9px] uppercase tracking-wider text-theme-text-primary cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Attendance (.CSV)</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowHostModal(false)}
                  className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-theme-bg bg-theme-text-primary rounded-xl hover:opacity-90 cursor-pointer"
                >
                  Save Workspace Standards
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
