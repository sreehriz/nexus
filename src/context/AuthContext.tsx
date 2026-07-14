import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isMockSupabase =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes("placeholder-url.supabase.co");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockSupabase) {
      // Mock initialization check
      const mockSession = localStorage.getItem("nexus_mock_session");
      if (mockSession) {
        try {
          setUser(JSON.parse(mockSession));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // 1. Check current session status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error("Supabase getSession error, falling back to guest mode:", err);
      setUser(null);
      setLoading(false);
    });

    // 2. Listen to token lifecycle events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (isMockSupabase) {
      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        const res = await fetch("http://localhost:8000/api/login", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("nexus_jwt", data.token);
          const mockUser: User = {
            id: data.user.id,
            email,
            user_metadata: { fullName: data.user.fullName, avatarColor: data.user.avatarColor },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("nexus_mock_session", JSON.stringify(mockUser));
          setUser(mockUser);
          return { error: null };
        } else {
          const errData = await res.json();
          return { error: { message: errData.detail || "Invalid email or password" } };
        }
      } catch (err) {
        console.warn("Backend auth failed, falling back to local guest session");
        const mockUser: User = {
          id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, ""),
          email,
          user_metadata: { fullName: email.split("@")[0] },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };
        localStorage.setItem("nexus_mock_session", JSON.stringify(mockUser));
        setUser(mockUser);
        return { error: null };
      }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    if (isMockSupabase) {
      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("fullName", metadata.fullName || email.split("@")[0]);
        formData.append("avatarColor", metadata.avatarColor || "from-indigo-500 to-cyan-400");
        const res = await fetch("http://localhost:8000/api/register", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("nexus_jwt", data.token);
          const mockUser: User = {
            id: data.user.id,
            email,
            user_metadata: { fullName: data.user.fullName, avatarColor: data.user.avatarColor },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("nexus_mock_session", JSON.stringify(mockUser));
          setUser(mockUser);
          return { error: null };
        } else {
          const errData = await res.json();
          return { error: { message: errData.detail || "Registration failed" } };
        }
      } catch (err) {
        console.warn("Backend sign up failed, falling back to local storage session");
        const mockUser: User = {
          id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, ""),
          email,
          user_metadata: metadata,
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };
        localStorage.setItem("nexus_mock_user_" + email, JSON.stringify({ email, password, metadata }));
        localStorage.setItem("nexus_mock_session", JSON.stringify(mockUser));
        setUser(mockUser);
        return { error: null };
      }
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const logout = async () => {
    if (isMockSupabase) {
      localStorage.removeItem("nexus_mock_session");
      localStorage.removeItem("nexus_jwt");
      setUser(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    if (isMockSupabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
