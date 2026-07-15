import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Hand, Smile,
  Users, MessageSquare, Brain, FileText, BarChart2, Paperclip, Edit3,
  MoreHorizontal, LogOut, Shield, Layout, Download, Globe,
} from "lucide-react";

type TabId = "members" | "chat" | "ai" | "notes" | "polls" | "files" | "whiteboard";

interface MeetingControlsProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSidebarOpen: boolean;
  activeTab: TabId;
  showOptionsDropdown: boolean;
  selectedTranslationLang: string;

  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onToggleHandRaise: () => void;
  onToggleSidebar: () => void;
  onSetActiveTab: (tab: TabId) => void;
  onToggleOptionsDropdown: () => void;
  onTriggerReaction: (emoji: string) => void;
  onSetTranslationLang: (lang: string) => void;
  onShowBgEffects: () => void;
  onShowHostModal: () => void;
  onLeave: () => void;
  onEndSession: () => void;

  isOrganizer: boolean;
}

const SIDEBAR_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "members", label: "Members", icon: Users },
  { id: "ai", label: "AI", icon: Brain },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "polls", label: "Polls", icon: BarChart2 },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "whiteboard", label: "Whiteboard", icon: Edit3 },
];

const REACTIONS = ["👍", "❤️", "😂", "🚀", "👏", "🎉", "😮", "✅"];

export default function MeetingControls({
  isMicOn, isCamOn, isScreenSharing, isHandRaised, isSidebarOpen,
  activeTab, showOptionsDropdown, selectedTranslationLang,
  onToggleMic, onToggleCam, onToggleScreen, onToggleHandRaise,
  onToggleSidebar, onSetActiveTab, onToggleOptionsDropdown,
  onTriggerReaction, onSetTranslationLang, onShowBgEffects, onShowHostModal,
  onLeave, onEndSession, isOrganizer,
}: MeetingControlsProps) {
  return (
    <div className="px-4 py-3 border-t border-theme-border/20 bg-theme-bg/30 flex items-center justify-between gap-3 flex-wrap">
      {/* Left group: Sidebar toggle + tab selector */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleSidebar}
          className={`p-2.5 rounded-xl border transition-all outline-none cursor-pointer text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
            isSidebarOpen
              ? "bg-theme-text-primary text-theme-bg border-transparent"
              : "border-theme-border text-theme-text-secondary hover:text-theme-text-primary"
          }`}
          title="Toggle Sidebar"
        >
          <Layout className="w-3.5 h-3.5" />
        </button>
        <div className="hidden md:flex gap-0.5">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { onSetActiveTab(tab.id); if (!isSidebarOpen) onToggleSidebar(); }}
              className={`p-2 rounded-xl border transition-all outline-none cursor-pointer ${
                activeTab === tab.id && isSidebarOpen
                  ? "bg-theme-text-primary/10 border-theme-text-primary/30 text-theme-text-primary"
                  : "border-transparent text-theme-text-muted hover:text-theme-text-primary hover:border-theme-border"
              }`}
              title={tab.label}
            >
              <tab.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Center: Primary media controls */}
      <div className="flex items-center gap-2">
        <ControlButton active={isMicOn} onClick={onToggleMic} icon={isMicOn ? Mic : MicOff} label={isMicOn ? "Mute" : "Unmute"} danger={!isMicOn} />
        <ControlButton active={isCamOn} onClick={onToggleCam} icon={isCamOn ? Video : VideoOff} label={isCamOn ? "Stop Video" : "Start Video"} danger={!isCamOn} />
        <ControlButton active={isScreenSharing} onClick={onToggleScreen} icon={MonitorUp} label={isScreenSharing ? "Stop Share" : "Share Screen"} />
        <ControlButton active={isHandRaised} onClick={onToggleHandRaise} icon={Hand} label={isHandRaised ? "Lower Hand" : "Raise Hand"} highlight={isHandRaised} />

        {/* Reactions quick picker */}
        <div className="relative group">
          <button
            className="p-2.5 rounded-xl border border-theme-border text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border/70 transition-all outline-none cursor-pointer"
            title="Reactions"
          >
            <Smile className="w-4 h-4" />
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto bg-theme-bg/95 backdrop-blur-md border border-theme-border/40 rounded-2xl p-2 flex gap-1.5 shadow-2xl z-50">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onTriggerReaction(emoji)}
                className="text-lg hover:scale-125 transition-transform cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-theme-text-primary/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* More Options dropdown */}
        <div className="relative">
          <button
            onClick={onToggleOptionsDropdown}
            className={`p-2.5 rounded-xl border transition-all outline-none cursor-pointer ${
              showOptionsDropdown
                ? "bg-theme-text-primary/10 border-theme-text-primary/30 text-theme-text-primary"
                : "border-theme-border text-theme-text-secondary hover:text-theme-text-primary"
            }`}
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showOptionsDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute bottom-full right-0 mb-2 w-52 glass-panel-heavy rounded-xl border border-theme-border/40 p-2 text-xs flex flex-col gap-1 shadow-2xl z-50"
              >
                <DropdownItem icon={Globe} label="Background Effects" onClick={() => { onShowBgEffects(); onToggleOptionsDropdown(); }} />
                <DropdownItem icon={Download} label="Download Recording" onClick={onToggleOptionsDropdown} />
                {isOrganizer && (
                  <DropdownItem icon={Shield} label="Organizer Dashboard" onClick={() => { onShowHostModal(); onToggleOptionsDropdown(); }} />
                )}
                <div className="flex items-center justify-between py-1.5 px-2">
                  <div className="flex items-center gap-2 text-theme-text-secondary">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Live Translation</span>
                  </div>
                  <select
                    value={selectedTranslationLang}
                    onChange={(e) => onSetTranslationLang(e.target.value)}
                    className="bg-theme-bg border border-theme-border rounded px-1.5 py-0.5 text-[10px] text-theme-text-primary outline-none"
                  >
                    <option value="none">Off</option>
                    <option value="ja">Japanese</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Leave / End */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLeave}
          className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 cursor-pointer outline-none"
        >
          <LogOut className="w-3.5 h-3.5 inline-block mr-1" />
          Leave
        </button>
        {isOrganizer && (
          <button
            onClick={onEndSession}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer outline-none shadow-lg"
            title="End session for all"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}

// Shared control button component
function ControlButton({
  active,
  onClick,
  icon: Icon,
  label,
  danger,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-xl border transition-all outline-none cursor-pointer flex items-center justify-center ${
        danger
          ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          : highlight
          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
          : active
          ? "border-theme-border text-theme-text-primary hover:border-theme-border/70 hover:bg-theme-text-primary/5"
          : "border-theme-border text-theme-text-secondary hover:text-theme-text-primary"
      }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function DropdownItem({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-text-primary/5 cursor-pointer w-full text-left transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
