import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "@/src/config";

const SOCKET_URL = BACKEND_URL;


interface UseSocketOptions {
  roomCode: string;
  userName: string;
  userId?: string;
  role: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  onEvent: (event: string, data: unknown) => void;
}

export function useSocket({
  roomCode,
  userName,
  userId,
  role,
  isMuted = false,
  isVideoOff = false,
  onEvent,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      onEventRef.current("connect", { sid: socket.id });
      // Join the room after connecting
      socket.emit("join_room", {
        roomCode,
        userName,
        userId,
        role,
        isMuted,
        isVideoOff,
      });
    });

    socket.on("disconnect", (reason) => {
      onEventRef.current("disconnect", { reason });
    });

    socket.on("connect_error", (err) => {
      onEventRef.current("connect_error", { message: err.message });
    });

    // Room events
    const roomEvents = [
      "join-success",
      "join-rejected",
      "waiting-room-status",
      "join-request",
      "participant-joined",
      "participant-left",
      "participant-muted",
      "participant-camera-toggled",
      "participant-hand-raised",
      "participant-screen-shared",
      "participant-role-changed",
      "meeting-ended",
      "meeting-locked-toggled",
      "waiting-room-toggled",
      "permission-changed",
      "ejected",
      // WebRTC signaling
      "sdp-offer",
      "sdp-answer",
      "ice-candidate",
      // Communication
      "chat-message-received",
      "reaction-received",
      "speaking-detected",
      "live-caption-received",
      "file-shared-broadcast",
      // Workspace
      "notes-updated",
      "whiteboard-stroke-received",
      "whiteboard-cleared",
      "recording-status-changed",
      "force-mute-mic",
    ];

    roomEvents.forEach((event) => {
      socket.on(event, (data: unknown) => {
        onEventRef.current(event, data);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userName, userId, role]);

  return { emit, socket: socketRef };
}
