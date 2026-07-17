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

// Import decomposed components and types
import {
  Participant,
  ChatMessage,
  TranscriptLine,
  Poll,
  SharedFile,
  FlyingReaction,
  ActionItem,
  Decision,
  TopicEntry,
  WhiteboardFlowchart
} from "./meeting/types";
import MeetingHeader from "./meeting/MeetingHeader";
import ParticipantGrid from "./meeting/ParticipantGrid";
import MeetingControls from "./meeting/MeetingControls";
import ChatPanel from "./meeting/ChatPanel";
import ParticipantsPanel from "./meeting/ParticipantsPanel";
import AIPanel from "./meeting/AIPanel";
import NotesPanel from "./meeting/NotesPanel";
import PollsPanel from "./meeting/PollsPanel";
import FilesPanel from "./meeting/FilesPanel";
import WhiteboardPanel from "./meeting/WhiteboardPanel";
import PostMeetingScreen from "./meeting/PostMeetingScreen";

export default function MeetingRoom({ roomCode, onLeave }: { roomCode: string; onLeave?: () => void }) {
  const { user } = useAuth();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
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
    {
      id: "you",
      name: `You (${userName})`,
      role: "Participant",
      avatarColor: user?.user_metadata?.avatarColor || "from-zinc-200 to-zinc-400",
      avatar: user?.user_metadata?.avatar || null,
      isMuted: !isMicOn,
      isVideoOff: !isCamOn,
      isSharingScreen: false,
      isHandRaised: false,
      isPinned: false,
      ping: 12,
      audioLevel: 0,
      language: "en"
    }
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

    const socketUrl = BACKEND_URL;

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
          const res = await fetch(`${BACKEND_URL}/api/translate`, {
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
            await fetch(`${BACKEND_URL}/api/recording/upload`, {
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
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
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
            url: `${BACKEND_URL}${fileData.url}`
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
      const res = await fetch(`${BACKEND_URL}/api/ai/summary`, {
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
      <PostMeetingScreen
        roomCode={roomCode}
        userName={userName}
        actionItems={actionItems}
        decisions={decisions}
        participants={participants}
        analyticsSummary={analyticsSummary}
        onReturnToLobby={() => {
          setIsPostMeeting(false);
          setParticipants([
            { id: "you", name: `You (${userName})`, role: "Organizer", avatarColor: "from-zinc-200 to-zinc-400", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 14, audioLevel: 0, language: "en" },
            { id: "sophia", name: "Sophia Vance", role: "Co-Host", avatarColor: "from-indigo-500 to-cyan-400", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 18, audioLevel: 0, language: "en" },
            { id: "liam", name: "Liam Drake", role: "Participant", avatarColor: "from-purple-600 to-pink-500", isMuted: false, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 22, audioLevel: 0, language: "en" },
            { id: "marcus", name: "Marcus Vance", role: "Participant", avatarColor: "from-amber-500 to-rose-500", isMuted: true, isVideoOff: false, isSharingScreen: false, isHandRaised: false, isPinned: false, ping: 15, audioLevel: 0, language: "en" }
          ]);
          if (onLeave) onLeave();
        }}
      />
    );
  }

  // --- MAIN MEETING ACTIVE ROOM VIEW ---
  return (
    <div className="relative w-full h-full max-w-none rounded-none border-none overflow-hidden flex flex-col text-left">
      <MeetingHeader
        roomCode={roomCode}
        userName={userName}
        recState={recState}
        recTime={recTime}
        latency={latency}
        mood={mood}
        showSimPanel={showSimPanel}
        onToggleSimPanel={() => setShowSimPanel(!showSimPanel)}
        onToggleRecording={() => {
          const isOrg = participants.find((p) => p.id === "you")?.role === "Organizer";
          if (!isOrg) return;
          const nextStatus = recState === "recording" ? "idle" : "recording";
          socketRef.current?.emit("recording_status_toggle", { roomCode, status: nextStatus });
        }}
        onAddMockParticipant={addMockParticipant}
        onRemoveMockParticipant={removeMockParticipant}
        onSimulateGesture={simulateGesture}
        onSimulateVoiceCommand={simulateVoiceCommand}
        participants={participants}
      />

      {/* Main Body Matrix: Adaptive Video Grid + Sidebar (if open) */}
      <div className="flex-1 flex flex-col lg:flex-row relative min-h-0 overflow-hidden">
        
        {/* Left Side: Adaptive Video Grid and Subtitle Overlay */}
        <div className="flex-1 flex flex-col p-4 bg-gradient-to-b from-transparent to-theme-bg/10 overflow-y-auto">
          <ParticipantGrid
            participants={participants}
            activeSpeakerId={activeSpeakerId}
            pinnedSpeakerId={pinnedSpeakerId}
            isScreenSharing={isScreenSharing}
            localStream={localStream}
            screenStream={screenStreamRef.current}
            peerStreams={peerStreams}
            gridLayoutClass={gridLayoutClass}
            onSetPinnedSpeaker={setPinnedSpeakerId}
          />

          {/* Subtitles & Live Caption Overlay */}
          {liveCaptionText && (
            <div className="mt-4 glass-panel rounded-xl p-3.5 flex items-start gap-3 border-transparent hover:bg-theme-surface/30 transition-all max-w-4xl mx-auto w-full shrink-0">
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
              <div className="flex border-b border-theme-border/20 bg-theme-surface/40 p-2 overflow-x-auto gap-1 shrink-0">
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
                {activeTab === "chat" && (
                  <ChatPanel
                    messages={chatMessages}
                    newMsgText={newMsgText}
                    onChangeText={setNewMsgText}
                    onSend={handleSendChat}
                  />
                )}
                {activeTab === "members" && (
                  <ParticipantsPanel
                    participants={participants}
                    joinRequests={joinRequests}
                    onAdmit={(id) => setJoinRequests([])}
                    onDeny={(id) => setJoinRequests([])}
                    onToggleMute={(id) => {
                      setParticipants((prev) =>
                        prev.map((memb) =>
                          memb.id === id ? { ...memb, isMuted: !memb.isMuted } : memb
                        )
                      );
                    }}
                    onKick={(id) => {
                      setParticipants((prev) => prev.filter((memb) => memb.id !== id));
                    }}
                  />
                )}
                {activeTab === "ai" && (
                  <AIPanel
                    transcript={transcript}
                    actionItems={actionItems}
                    decisions={decisions}
                    onGenerateMOM={() => {
                      const momText = `MINUTES OF MEETING\n\n- Project Duration: 46m\n- Presenters: Sophia, Liam, Marcus\n\n- Decisions resolved: Socket.IO Router, AES-256 Client Encryptions.`;
                      alert("AI minutes generated and appended to Notes tab!");
                      setMeetingNotes((prev) => `${prev}\n\n${momText}`);
                    }}
                  />
                )}
                {activeTab === "notes" && (
                  <NotesPanel
                    meetingNotes={meetingNotes}
                    onChangeNotes={setMeetingNotes}
                    onSmartNoteify={runSmartNoteify}
                  />
                )}
                {activeTab === "polls" && (
                  <PollsPanel
                    polls={polls}
                    newPollQuestion={newPollQuestion}
                    onChangeQuestion={setNewPollQuestion}
                    newPollOptions={newPollOptions}
                    onChangeOptions={setNewPollOptions}
                    onVote={handleVote}
                    onCreatePoll={createPoll}
                  />
                )}
                {activeTab === "files" && (
                  <FilesPanel
                    sharedFiles={sharedFiles}
                    onFileUpload={handleFileUpload}
                  />
                )}
                {activeTab === "whiteboard" && (
                  <WhiteboardPanel
                    canvasRef={canvasRef}
                    drawingColor={drawingColor}
                    lineWidth={lineWidth}
                    whiteboardFlowcharts={whiteboardFlowcharts}
                    onSetDrawingColor={setDrawingColor}
                    onSetLineWidth={setLineWidth}
                    onCleanToFlowchart={cleanToFlowchart}
                    onClearWhiteboard={clearWhiteboard}
                    onStartDrawing={startDrawing}
                    onDraw={draw}
                    onStopDrawing={stopDrawing}
                  />
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

      <MeetingControls
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isSidebarOpen={isSidebarOpen}
        activeTab={activeTab}
        showOptionsDropdown={showOptionsDropdown}
        selectedTranslationLang={selectedTranslationLang}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreen={toggleScreenShare}
        onToggleHandRaise={toggleHandRaise}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSetActiveTab={setActiveTab}
        onToggleOptionsDropdown={() => setShowOptionsDropdown(!showOptionsDropdown)}
        onTriggerReaction={triggerReaction}
        onSetTranslationLang={(lang) => setSelectedTranslationLang(lang as any)}
        onShowBgEffects={() => setShowBgEffectsModal(true)}
        onShowHostModal={() => setShowHostModal(true)}
        onLeave={() => { if (onLeave) onLeave(); }}
        onEndSession={() => {
          if (confirm("End this meeting for everyone?")) {
            socketRef.current?.emit("host_end_meeting", { roomCode });
          }
        }}
        isOrganizer={participants.find(p => p.id === "you")?.role === "Organizer"}
      />

      {/* --- BACKGROUND EFFECTS SELECTOR MODAL --- */}
      <AnimatePresence>
        {showBgEffectsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowBgEffectsModal(false)} className="absolute inset-0 bg-[#0B0B0B]/80 backdrop-blur-sm" />
            <div className="glass-panel-heavy rounded-2xl border border-theme-border/40 p-6 w-full max-w-md shadow-2xl relative z-10 text-left animate-fade-in">
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
            <div className="glass-panel-heavy rounded-2xl border border-theme-border/40 p-6 w-full max-w-lg shadow-2xl relative z-10 text-left animate-fade-in">
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
