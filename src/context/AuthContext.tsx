import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: any; verificationRequired?: boolean; userId?: string; email?: string }>;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: any; verificationRequired?: boolean; userId?: string; email?: string }>;
  logout: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshToken: () => Promise<boolean>;
  verifyOTP: (userId: string, otp: string, purpose: string) => Promise<{ error: any; status?: string; token?: string; user?: any }>;
  submitResetPassword: (userId: string, otp: string, newPw: string, confirmPw: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check JWT on startup
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Check for token in URL parameters (redirect from Google/GitHub callback)
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("token");

      let token = tokenParam;
      if (tokenParam) {
        localStorage.setItem("nexus_jwt", tokenParam);
        // Clean URL to keep history neat
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } else {
        token = localStorage.getItem("nexus_jwt");
      }

      if (token) {
        const payload = decodeJWT(token);
        if (payload && payload.exp * 1000 > Date.now()) {
          const loggedUser: User = {
            id: payload.sub,
            email: payload.email,
            user_metadata: { fullName: payload.name || payload.email.split("@")[0], avatarColor: "from-indigo-500 to-cyan-400" },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("nexus_mock_session", JSON.stringify(loggedUser));
          setUser(loggedUser);
        } else {
          // Token expired, clear
          localStorage.removeItem("nexus_jwt");
          localStorage.removeItem("nexus_mock_session");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        if (data.status === "verification_required") {
          return { error: null, verificationRequired: true, userId: data.userId, email: data.email };
        }
        
        localStorage.setItem("nexus_jwt", data.token);
        const loggedUser: User = {
          id: data.user.id,
          email,
          user_metadata: { fullName: data.user.fullName, avatarColor: data.user.avatarColor },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };
        localStorage.setItem("nexus_mock_session", JSON.stringify(loggedUser));
        setUser(loggedUser);
        return { error: null };
      } else {
        return { error: { message: data.detail || "Invalid email or password" } };
      }
    } catch {
      return { error: { message: "Cannot connect to server. Please ensure the backend is running on port 8000." } };
    }
  };

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("username", metadata.username || email.split("@")[0]);
      formData.append("password", password);
      formData.append("fullName", metadata.fullName || email.split("@")[0]);
      formData.append("avatarColor", metadata.avatarColor || "from-indigo-500 to-cyan-400");
      
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === "verification_required") {
          return { error: null, verificationRequired: true, userId: data.userId, email: data.email };
        }
        return { error: { message: "Unexpected server response." } };
      } else {
        return { error: { message: data.detail || "Registration failed" } };
      }
    } catch {
      return { error: { message: "Cannot connect to server. Please ensure the backend is running on port 8000." } };
    }
  };

  const verifyOTP = async (userId: string, otp: string, purpose: string) => {
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("otp", otp);
      formData.append("purpose", purpose);
      
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (purpose === "verify_email") {
          localStorage.setItem("nexus_jwt", data.token);
          const loggedUser: User = {
            id: data.user.id,
            email: data.user.email,
            user_metadata: { fullName: data.user.fullName, avatarColor: data.user.avatarColor },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("nexus_mock_session", JSON.stringify(loggedUser));
          setUser(loggedUser);
        }
        return { error: null, status: data.status };
      } else {
        return { error: { message: data.detail || "OTP verification failed" } };
      }
    } catch {
      return { error: { message: "Cannot connect to server. Ensure port 8000 is open." } };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      return { error: null }; // Always show success to prevent enumeration
    } catch {
      return { error: { message: "Cannot connect to server." } };
    }
  };

  const submitResetPassword = async (userId: string, otp: string, newPw: string, confirmPw: string) => {
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("otp", otp);
      formData.append("newPassword", newPw);
      formData.append("confirmPassword", confirmPw);
      
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        return { error: null };
      } else {
        return { error: { message: data.detail || "Password reset failed" } };
      }
    } catch {
      return { error: { message: "Cannot connect to server." } };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed, clearing local session anyway.", e);
    }
    localStorage.removeItem("nexus_mock_session");
    localStorage.removeItem("nexus_jwt");
    setUser(null);
    return { error: null };
  };

  const refreshToken = async (): Promise<boolean> => {
    const existingToken = localStorage.getItem("nexus_jwt");
    if (!existingToken) return false;
    try {
      const res = await fetch(`${BACKEND_URL}/api/refresh`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("nexus_jwt", data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      login, 
      signUp, 
      logout, 
      resetPassword, 
      refreshToken,
      verifyOTP,
      submitResetPassword
    }}>
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
