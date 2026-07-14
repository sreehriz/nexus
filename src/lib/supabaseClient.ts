/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Please configure them in your .env.local file to connect to Supabase."
  );
}

const isMockSupabase =
  !supabaseUrl || supabaseUrl.includes("placeholder-url.supabase.co");

const client = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

if (isMockSupabase) {
  // Mock getUser method to fetch from localStorage mock session
  client.auth.getUser = async (jwt?: string) => {
    const sessionRaw = localStorage.getItem("nexus_mock_session");
    if (sessionRaw) {
      try {
        return { data: { user: JSON.parse(sessionRaw) }, error: null } as any;
      } catch {
        return { data: { user: null }, error: { message: "Invalid session" } } as any;
      }
    }
    return { data: { user: null }, error: { message: "No session found" } } as any;
  };

  // Mock signInWithOAuth to simulate login success
  client.auth.signInWithOAuth = async (credentials: any) => {
    const provider = credentials.provider || "oauth";
    const mockUser = {
      id: "mock-oauth-id-" + provider,
      email: `${provider}@nexus.io`,
      user_metadata: {
        fullName: provider.charAt(0).toUpperCase() + provider.slice(1) + " User",
        username: provider + "_user",
      },
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("nexus_mock_session", JSON.stringify(mockUser));
    
    // Simulate navigation/auth redirection callbacks
    setTimeout(() => {
      window.location.reload();
    }, 500);

    return { data: {} as any, error: null };
  };
}

export const supabase = client;
