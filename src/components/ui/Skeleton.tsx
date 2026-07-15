import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-theme-text-primary/[0.06] dark:bg-white/[0.06]",
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
      <Skeleton className="h-2.5 w-3/5" />
    </div>
  );
}

export function SkeletonMeeting() {
  return (
    <div className="glass-panel rounded-xl px-5 py-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>
      {/* Recent meetings */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        {[...Array(4)].map((_, i) => (
          <SkeletonMeeting key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <Skeleton className="w-20 h-20 rounded-2xl" />
        <div className="flex flex-col gap-3 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <div className="h-px bg-theme-border/20" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
