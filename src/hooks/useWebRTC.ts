import { useRef, useCallback, useEffect, useState } from "react";

interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}

interface UseWebRTCOptions {
  localStream: MediaStream | null;
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  emit: (event: string, data: unknown) => void;
  mySocketId: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC({
  localStream,
  onRemoteStream,
  onRemoteStreamRemoved,
  emit,
  mySocketId,
}: UseWebRTCOptions) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  const createPeer = useCallback(
    (targetId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Add local tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // When remote tracks arrive
      pc.ontrack = (event) => {
        if (event.streams[0]) {
          onRemoteStream(targetId, event.streams[0]);
        }
      };

      // ICE candidate exchange
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit("ice_candidate", {
            target: targetId,
            candidate: event.candidate,
          });
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          onRemoteStreamRemoved(targetId);
          peersRef.current.delete(targetId);
        }
      };

      peersRef.current.set(targetId, pc);
      return pc;
    },
    [emit, onRemoteStream, onRemoteStreamRemoved]
  );

  /** Called when a new participant joins — we are the initiator */
  const initiateCall = useCallback(
    async (targetId: string) => {
      if (peersRef.current.has(targetId)) return;
      const pc = createPeer(targetId);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        emit("sdp_offer", { target: targetId, offer: pc.localDescription });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [createPeer, emit]
  );

  /** Handle incoming SDP offer — we are the receiver */
  const handleOffer = useCallback(
    async (senderId: string, offer: RTCSessionDescriptionInit) => {
      let pc = peersRef.current.get(senderId);
      if (!pc) {
        pc = createPeer(senderId);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit("sdp_answer", { target: senderId, answer: pc.localDescription });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    },
    [createPeer, emit]
  );

  /** Handle incoming SDP answer */
  const handleAnswer = useCallback(
    async (senderId: string, answer: RTCSessionDescriptionInit) => {
      const pc = peersRef.current.get(senderId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    },
    []
  );

  /** Handle incoming ICE candidate */
  const handleIceCandidate = useCallback(
    async (senderId: string, candidate: RTCIceCandidateInit) => {
      const pc = peersRef.current.get(senderId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    },
    []
  );

  /** Remove a peer connection when participant leaves */
  const removePeer = useCallback(
    (peerId: string) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(peerId);
      }
      onRemoteStreamRemoved(peerId);
    },
    [onRemoteStreamRemoved]
  );

  /** Replace tracks when local stream changes (e.g., screen share) */
  const replaceTrack = useCallback(
    async (newTrack: MediaStreamTrack, kind: "video" | "audio") => {
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === kind);
        if (sender) {
          try {
            await sender.replaceTrack(newTrack);
          } catch (err) {
            console.error("Error replacing track:", err);
          }
        }
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const pc of peersRef.current.values()) {
        pc.close();
      }
      peersRef.current.clear();
    };
  }, []);

  return {
    initiateCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer,
    replaceTrack,
    peers: peersRef,
  };
}
