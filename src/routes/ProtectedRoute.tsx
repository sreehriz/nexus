import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-primary/70" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-theme-text-muted select-none">
          Establishing Secure Handshake...
        </span>
      </div>
    );
  }

  if (!user) {
    // Preserve the destination so we can redirect back after sign-in
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
