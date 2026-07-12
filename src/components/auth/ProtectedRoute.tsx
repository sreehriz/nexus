import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirect: (view: "landing" | "signin" | "signup" | "forgot") => void;
}

export default function ProtectedRoute({ children, onRedirect }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      onRedirect("signin");
    }
  }, [user, loading, onRedirect]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0B]/85 backdrop-blur-xl text-theme-text-primary gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-primary/70" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-theme-text-muted select-none">
          Establishing Secure Handshake...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
