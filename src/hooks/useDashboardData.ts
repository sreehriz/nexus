import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export interface DashboardMetrics {
  id: string;
  user_id: string;
  total_projects: number;
  active_tasks: number;
  monthly_usage: number;
  recent_activity: Array<{ event: string; time: string }>;
  created_at: string;
  updated_at: string;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const isMockSupabase =
      !import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL.includes("placeholder-url.supabase.co");

    if (isMockSupabase) {
      // Mock metrics data for testing
      setTimeout(() => {
        setData({
          id: "mock-metrics-id",
          user_id: user.id,
          total_projects: 12,
          active_tasks: 24,
          monthly_usage: 128,
          recent_activity: [
            { event: "Connected local client to Tokyo Edge Relay", time: "Just now" },
            { event: "MOM Summary generated for Edge Negotiation", time: "12 mins ago" },
            { event: "Uploaded architecture-blueprint.pdf", time: "1 hour ago" },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const { data: row, error: fetchError } = await supabase
        .from("dashboard_metrics")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setData(row);
    } catch (err: any) {
      console.error("Error fetching dashboard metrics:", err);
      setError(err.message || "Failed to load telemetry data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { data, loading, error, refetch: fetchMetrics };
}
