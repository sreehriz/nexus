import { useState, useRef, useCallback, useEffect } from "react";

interface UseMeetingControlsOptions {
  onMicChange?: (isMuted: boolean) => void;
  onCameraChange?: (isVideoOff: boolean) => void;
  onScreenShareChange?: (isSharing: boolean) => void;
}

interface UseMeetingControlsReturn {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  initLocalStream: () => Promise<void>;
  stopAllStreams: () => void;
  audioLevel: number;
}

export function useMeetingControls({
  onMicChange,
  onCameraChange,
  onScreenShareChange,
}: UseMeetingControlsOptions = {}): UseMeetingControlsReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const measureAudioLevel = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.round(avg));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AudioContext not available or no mic
    }
  }, []);

  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      measureAudioLevel(stream);
    } catch (err) {
      console.warn("Could not access camera/mic:", err);
      // Try audio only
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setLocalStream(audioOnlyStream);
        localStreamRef.current = audioOnlyStream;
        setIsCamOn(false);
        measureAudioLevel(audioOnlyStream);
      } catch {
        // No media access at all
        setIsMicOn(false);
        setIsCamOn(false);
      }
    }
  }, [measureAudioLevel]);

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      onMicChange?.(!next); // isMuted = !isMicOn
      return next;
    });
  }, [onMicChange]);

  const toggleCamera = useCallback(() => {
    setIsCamOn((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      onCameraChange?.(!next); // isVideoOff = !isCamOn
      return next;
    });
  }, [onCameraChange]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing, revert to camera
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      onScreenShareChange?.(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
        setScreenStream(screen);
        setIsScreenSharing(true);
        onScreenShareChange?.(true);

        // Auto-stop when user clicks browser's "Stop sharing"
        screen.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          onScreenShareChange?.(false);
        };
      } catch (err) {
        console.warn("Screen sharing denied or cancelled:", err);
      }
    }
  }, [isScreenSharing, screenStream, onScreenShareChange]);

  const stopAllStreams = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
  }, [screenStream]);

  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, []);

  return {
    localStream,
    screenStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    initLocalStream,
    stopAllStreams,
    audioLevel,
  };
}
