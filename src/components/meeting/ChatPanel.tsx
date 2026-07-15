import React, { useRef, useEffect } from "react";
import { Send, Code } from "lucide-react";
import { ChatMessage } from "./types";

interface ChatPanelProps {
  messages: ChatMessage[];
  newMsgText: string;
  onChangeText: (text: string) => void;
  onSend: (e: React.FormEvent) => void;
}

export default function ChatPanel({ messages, newMsgText, onChangeText, onSend }: ChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-theme-text-muted">
        <span>Live Chat</span>
        <span>{messages.length} messages</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-theme-text-muted py-8">
            <Send className="w-7 h-7 opacity-20" />
            <p className="text-[11px] text-center font-light">No messages yet. Be the first!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl border text-left ${
                msg.isMe
                  ? "bg-theme-text-primary/8 border-theme-text-primary/20 ml-4"
                  : "bg-theme-surface/40 border-theme-border/20 mr-4"
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
              {/* Reactions row */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {msg.reactions.map((r) => (
                    <span
                      key={r.emoji}
                      className="text-[10px] bg-theme-bg/60 border border-theme-border/20 rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-theme-text-primary/10 transition-colors"
                      title={r.users.join(", ")}
                    >
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={onSend} className="flex gap-2 border-t border-theme-border/25 pt-2">
        <input
          type="text"
          value={newMsgText}
          onChange={(e) => onChangeText(e.target.value)}
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
  );
}
