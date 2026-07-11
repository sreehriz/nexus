import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AuthCard from "./AuthCard";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

interface ForgotPasswordPageProps {
  onNavigate: (view: "landing" | "signin" | "signup" | "forgot") => void;
}

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setLoading(true);
    setErrorMessage("");

    // Simulate recovery link dispatch
    setTimeout(() => {
      setLoading(false);
      if (data.email.toLowerCase() === "error@nexus.com") {
        setErrorMessage("Node address not registered in our matrix. Please verify the email.");
      } else {
        setSuccess(true);
      }
    }, 1800);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[calc(100vh-140px)]">
      {/* Left Column: Abstract Graphic / Title Context */}
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
            Restore Node <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-text-primary via-theme-text-muted to-theme-text-primary/40">
              Access Code
            </span>
          </h1>
          <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed max-w-md font-normal">
            Request an encrypted authorization handshake link to reset your secure key parameters and log back in.
          </p>
        </div>
      </motion.div>

      {/* Right Column: Immersive Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="col-span-1 lg:col-span-6 flex justify-center"
      >
        <AuthCard>
          <AnimatePresence mode="wait">
            {!success ? (
              /* Request Reset Link Form */
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5 text-left"
              >
                <div className="text-center md:text-left flex flex-col gap-2">
                  <h2 className="text-2xl font-display font-bold text-theme-text-primary tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-theme-text-muted">
                    Enter your email to receive an authentication reset link.
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <AuthInput
                    {...register("email")}
                    label="Email Address"
                    type="email"
                    icon={<Mail className="w-4.5 h-4.5" />}
                    placeholder="Enter your email address"
                    error={errors.email?.message}
                    disabled={loading}
                  />

                  <AuthButton
                    type="submit"
                    loading={loading}
                    loadingText="Broadcasting link..."
                    className="mt-2"
                  >
                    <span>Send Reset Link</span>
                    <Send className="w-4 h-4" />
                  </AuthButton>
                </form>

                <div className="h-px bg-theme-border/20 my-1" />

                <button
                  type="button"
                  onClick={() => onNavigate("signin")}
                  className="w-full py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-theme-text-muted hover:text-theme-text-primary transition-colors flex items-center justify-center gap-2 outline-none cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </motion.div>
            ) : (
              /* Success Screen */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center gap-6 py-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold text-theme-text-primary tracking-tight">
                    Reset Link Dispatched
                  </h3>
                  <p className="text-xs text-theme-text-secondary leading-relaxed max-w-sm">
                    We have successfully broadcast a password recovery handshake. Please inspect your email inbox for authorization.
                  </p>
                </div>

                <AuthButton
                  type="button"
                  onClick={() => onNavigate("signin")}
                  className="mt-2"
                >
                  <span>Return to Sign In</span>
                </AuthButton>
              </motion.div>
            )}
          </AnimatePresence>
        </AuthCard>
      </motion.div>
    </div>
  );
}
