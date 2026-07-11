import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import AuthCard from "./AuthCard";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import SocialLoginButton from "./SocialLoginButton";

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Please enter your password"),
  rememberMe: z.boolean().optional(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInPageProps {
  onNavigate: (view: "landing" | "signin" | "signup" | "forgot") => void;
  onSuccess: (name: string) => void;
}

export default function SignInPage({ onNavigate, onSuccess }: SignInPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormValues) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Simulate backend validation request
    setTimeout(() => {
      if (data.email.toLowerCase() === "error@nexus.com") {
        setLoading(false);
        setErrorMessage("Invalid email or password. Please verify your credentials.");
      } else {
        setSuccessMessage("Welcome back to Nexus");
        setTimeout(() => {
          setLoading(false);
          // Split email prefix for display if name is not set
          const derivedName = data.email.split("@")[0];
          onSuccess(derivedName.charAt(0).toUpperCase() + derivedName.slice(1));
        }, 1200);
      }
    }, 1800);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[calc(100vh-140px)]">
      {/* Left Column: Premium Brand Presence & Visual Animation (hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:col-span-6 flex-col text-left gap-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-text-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <span className="font-panchang font-extrabold text-theme-bg text-sm">N</span>
          </div>
          <span className="font-panchang font-extrabold text-xl tracking-wider text-theme-text-primary uppercase">
            Nexus
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-theme-text-primary leading-[1.15]">
            Enterprise-Grade <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-text-primary via-theme-text-muted to-theme-text-primary/40">
              Conferencing Matrix
            </span>
          </h1>
          <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed max-w-md font-normal">
            Simplicity in connection. Speed in collaboration. Sign in to enter the encrypted loop of global meetings.
          </p>
        </div>

        {/* Rotating Geometric Mesh Visualizer */}
        <div className="relative w-full max-w-sm aspect-square rounded-3xl glass-panel border border-theme-border/30 p-8 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
          
          {/* Animated SVG Graphic */}
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            className="w-48 h-48 text-theme-text-primary/20 dark:text-theme-text-primary/10"
            viewBox="0 0 100 100"
          >
            {/* Outer rings */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
            
            {/* Mesh lines connecting vertices */}
            <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.25" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.25" />
            <line x1="18" y1="18" x2="82" y2="82" stroke="currentColor" strokeWidth="0.25" />
            <line x1="18" y1="82" x2="82" y2="18" stroke="currentColor" strokeWidth="0.25" />
            
            {/* Interactive nodes */}
            <motion.circle cx="50" cy="15" r="2.5" fill="currentColor" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 3 }} />
            <motion.circle cx="50" cy="85" r="2.5" fill="currentColor" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 1.5 }} />
            <motion.circle cx="15" cy="50" r="2.5" fill="currentColor" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 0.75 }} />
            <motion.circle cx="85" cy="50" r="2.5" fill="currentColor" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 2.25 }} />
          </motion.svg>

          <div className="absolute bottom-5 left-5 right-5 flex justify-between items-center text-[10px] font-mono text-theme-text-muted">
            <span>Core: Active</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Latency: 12ms
            </span>
          </div>
        </div>
      </motion.div>

      {/* Right Column: Immersive Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="col-span-1 lg:col-span-6 flex justify-center"
      >
        <AuthCard>
          <div className="text-center md:text-left flex flex-col gap-2">
            <h2 className="text-2xl font-display font-bold text-theme-text-primary tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-theme-text-muted">
              Connect to your secure communications portal.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs text-left"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            <AuthInput
              {...register("email")}
              label="Email Address"
              type="email"
              icon={<Mail className="w-4.5 h-4.5" />}
              placeholder="Enter your email address"
              error={errors.email?.message}
              disabled={loading || successMessage !== ""}
            />

            <div className="flex flex-col gap-1.5">
              <AuthInput
                {...register("password")}
                label="Password"
                type="password"
                icon={<Lock className="w-4.5 h-4.5" />}
                placeholder="Enter your password"
                error={errors.password?.message}
                disabled={loading || successMessage !== ""}
              />
              <div className="flex items-center justify-between mt-1 text-[11px] font-sans">
                <label className="flex items-center gap-2 text-theme-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="accent-theme-text-primary rounded border-theme-border/60 bg-theme-secondary/40 text-theme-bg outline-none"
                    disabled={loading || successMessage !== ""}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate("forgot")}
                  className="text-theme-text-muted hover:text-theme-text-primary transition-colors hover:underline cursor-pointer"
                  disabled={loading || successMessage !== ""}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <AuthButton
              type="submit"
              loading={loading}
              loadingText="Signing you in..."
              className="mt-2"
              disabled={successMessage !== ""}
            >
              Sign In
            </AuthButton>
          </form>

          {/* Social login separators */}
          <div className="flex items-center gap-3 py-1.5">
            <div className="h-px bg-theme-border/20 flex-1" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted select-none">
              Or Secure Connection
            </span>
            <div className="h-px bg-theme-border/20 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <SocialLoginButton
              provider="google"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  onSuccess("Google User");
                }, 1500);
              }}
              disabled={loading || successMessage !== ""}
            />
            <SocialLoginButton
              provider="github"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  onSuccess("GitHub User");
                }, 1500);
              }}
              disabled={loading || successMessage !== ""}
            />
          </div>

          <div className="text-center text-[12px] font-sans text-theme-text-secondary mt-3">
            Don't have an account?{" "}
            <button
              onClick={() => onNavigate("signup")}
              className="text-theme-text-primary font-semibold hover:underline cursor-pointer outline-none"
              disabled={loading || successMessage !== ""}
            >
              Create one
            </button>
          </div>
        </AuthCard>
      </motion.div>
    </div>
  );
}
