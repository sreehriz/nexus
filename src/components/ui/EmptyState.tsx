import React from "react";
import { motion } from "motion/react";
import { Video, Calendar, Search, Users, Bell, FileText, FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6 gap-5"
    >
      <div className="w-16 h-16 rounded-2xl bg-theme-text-primary/5 border border-theme-border/40 flex items-center justify-center">
        <Icon className="w-7 h-7 text-theme-text-muted" />
      </div>
      <div className="flex flex-col gap-2 max-w-xs">
        <h3 className="text-base font-semibold text-theme-text-primary">{title}</h3>
        <p className="text-sm text-theme-text-secondary leading-relaxed">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {action && (
            <button
              onClick={action.onClick}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-theme-text-primary text-theme-bg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border border-theme-border text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-text-primary transition-all"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common scenarios
export function NoMeetingsEmpty({ onStart, onJoin }: { onStart: () => void; onJoin?: () => void }) {
  return (
    <EmptyState
      icon={Video}
      title="No meetings yet"
      description="Start your first Nexus meeting and invite your team. Every meeting is automatically remembered."
      action={{ label: "Start Meeting", onClick: onStart }}
      secondaryAction={onJoin ? { label: "Join Meeting", onClick: onJoin } : undefined}
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No meetings or conversations match "${query}". Try a different search.`}
    />
  );
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      icon={Bell}
      title="All caught up"
      description="You have no new notifications. Nexus will alert you when meetings start, when you're mentioned, or when action items are assigned."
    />
  );
}

export function NoFilesEmpty({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No files shared"
      description="Files shared during meetings will appear here for easy access."
      action={onUpload ? { label: "Upload File", onClick: onUpload } : undefined}
    />
  );
}

export function NoTeamMembersEmpty({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No team members yet"
      description="Invite your team to Nexus and collaborate in real-time with premium video, AI summaries, and shared workspaces."
      action={onInvite ? { label: "Invite Team", onClick: onInvite } : undefined}
    />
  );
}

export function NoMemoryResultsEmpty({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Calendar}
      title={query ? "Nothing found in your memory" : "Your memory is empty"}
      description={
        query
          ? `Nexus couldn't find anything about "${query}" in your past meetings. Try rephrasing your question.`
          : "Once you attend meetings, Nexus Memory will index everything automatically — making every conversation searchable."
      }
    />
  );
}
