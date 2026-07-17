// Shared type definitions for meeting components

export interface Participant {
  id: string;
  name: string;
  role: "Organizer" | "Co-Host" | "Participant";
  avatarColor: string;
  avatar?: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  isPinned: boolean;
  ping: number;
  audioLevel: number; // 0 to 100
  language: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
  repliesCount?: number;
  reactions?: { emoji: string; count: number; users: string[] }[];
  isCode?: boolean;
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: string;
  detectedLanguage?: string;
  translation?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  votedOptionIdx?: number;
  creator: string;
}

export interface SharedFile {
  name: string;
  size: string;
  sender: string;
  time: string;
  fileUrl?: string;
}

export interface FlyingReaction {
  id: string;
  emoji: string;
  left: number; // percentage width
  delay: number;
}

export interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  done: boolean;
}

export interface Decision {
  id: string;
  text: string;
  timestamp: string;
}

export interface TopicEntry {
  time: string;
  topic: string;
}

export interface WhiteboardFlowchart {
  id: string;
  x: number;
  y: number;
  type: string;
  label: string;
}

export interface MeetingHealthMetrics {
  participation: number;
  audioQuality: number;
  speakingBalance: string;
  networkQuality: number;
  engagement: number;
}
