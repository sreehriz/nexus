import React from "react";
import { Poll } from "./types";

interface PollsPanelProps {
  polls: Poll[];
  newPollQuestion: string;
  onChangeQuestion: (q: string) => void;
  newPollOptions: string[];
  onChangeOptions: (opts: string[]) => void;
  onVote: (pollId: string, optIdx: number) => void;
  onCreatePoll: () => void;
}

export default function PollsPanel({
  polls,
  newPollQuestion,
  onChangeQuestion,
  newPollOptions,
  onChangeOptions,
  onVote,
  onCreatePoll,
}: PollsPanelProps) {
  return (
    <div className="flex flex-col gap-4 text-left h-full">
      <span className="font-mono text-[10px] uppercase text-theme-text-muted border-b border-theme-border/10 pb-1">
        Active Workspace Polls
      </span>

      {/* Poll list */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 min-h-0">
        {polls.length === 0 ? (
          <p className="text-[10px] text-theme-text-muted text-center py-4">No active polls deployed.</p>
        ) : (
          polls.map((poll) => {
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
                        onClick={() => poll.votedOptionIdx === undefined && onVote(poll.id, optIdx)}
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
          })
        )}
      </div>

      {/* Create new Poll Creator form */}
      <div className="border-t border-theme-border/25 pt-3 mt-1 flex flex-col gap-3 shrink-0">
        <span className="font-mono text-[9px] uppercase text-cyan-400 font-bold tracking-wider">
          Create Meeting Poll
        </span>
        <input
          type="text"
          placeholder="Poll Question?"
          value={newPollQuestion}
          onChange={(e) => onChangeQuestion(e.target.value)}
          className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-2 text-xs text-theme-text-primary outline-none focus:border-theme-text-primary/30"
        />
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Option 1"
            value={newPollOptions[0] || ""}
            onChange={(e) => {
              const clone = [...newPollOptions];
              clone[0] = e.target.value;
              onChangeOptions(clone);
            }}
            className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-primary outline-none focus:border-theme-text-primary/30"
          />
          <input
            type="text"
            placeholder="Option 2"
            value={newPollOptions[1] || ""}
            onChange={(e) => {
              const clone = [...newPollOptions];
              clone[1] = e.target.value;
              onChangeOptions(clone);
            }}
            className="bg-theme-text-primary/5 border border-theme-border/30 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-primary outline-none focus:border-theme-text-primary/30"
          />
        </div>
        <button
          onClick={onCreatePoll}
          className="py-2 bg-theme-text-primary text-theme-bg font-semibold rounded-lg hover:opacity-90 transition-opacity text-[10px] uppercase font-mono tracking-wider cursor-pointer outline-none"
        >
          Deploy Poll
        </button>
      </div>
    </div>
  );
}
