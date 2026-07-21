import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/src/config";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ShieldAlert, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuthCard from "../components/auth/AuthCard";
import AuthButton from "../components/auth/AuthButton";

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOTP, signUp } = useAuth();
  const { toast } = useToast();

  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "";
  const purpose = searchParams.get("purpose") || "verify_email";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Autofocus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, "");
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto focus next input
    if (newOtp[index] && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current value
        newOtp[index] = "";
      } else if (index > 0) {
        // Move focus back and clear previous value
        newOtp[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }
      setOtp(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").substring(0, 6);
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last or next input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await verifyOTP(userId, code, purpose);
      setLoading(false);

      if (res.error) {
        setErrorMsg(res.error.message || "OTP verification failed. Check the code.");
        toast("Verification Failed", "error");
      } else {
        setSuccess(true);
        toast("Security node linked successfully!", "success");
        
        setTimeout(() => {
          if (purpose === "verify_email") {
            navigate("/dashboard");
          } else {
            // For password resets, proceed to final step
            navigate(`/forgot-password?userId=${userId}&otp=${code}&step=3`);
          }
        }, 1500);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || "An unexpected network anomaly was detected.");
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    setErrorMsg("");
    try {
      // Trigger new OTP signal (re-request password reset or resend verify email code)
      // Since signup handles initial trigger, we can fetch reset/verification dispatch endpoints.
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("email", email);
      
      let endpoint = "/auth/forgot-password";
      if (purpose === "verify_email") {
        // Simply trigger email login verification code resend
        endpoint = "/login";
      }
      
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      setLoading(false);
      if (res.ok) {
        setTimer(600); // Reset countdown
        setCanResend(false);
        toast("New verification code dispatched to your node.", "success");
      } else {
        setErrorMsg("Failed to dispatch code. Contact operators.");
      }
    } catch {
      setLoading(false);
      setErrorMsg("Network error trying to re-initiate handshake.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 py-12 md:py-24 flex items-center min-h-[calc(100vh-140px)] text-left">
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="verify-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <AuthCard>
              <div className="text-center flex flex-col gap-2">
                <div className="w-12 h-12 rounded-2xl bg-theme-text-primary/5 border border-theme-border flex items-center justify-center mx-auto mb-2 text-theme-text-primary">
                  <Mail className="w-5.5 h-5.5" />
                </div>
                <h2 className="text-2xl font-display font-bold text-theme-text-primary tracking-tight">
                  Verify Credentials
                </h2>
                <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm mx-auto">
                  A 6-digit confirmation signal was dispatched to <strong className="text-theme-text-primary">{email}</strong>. Enter the parameters below.
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* 6 digits input grid */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      value={digit}
                      onChange={(e) => handleChange(e.target, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onPaste={handlePaste}
                      disabled={loading}
                      className="w-full aspect-square text-center text-xl font-bold font-mono bg-theme-secondary/25 focus:bg-theme-secondary/40 border border-theme-border/50 focus:border-theme-text-primary/60 rounded-xl outline-none transition-all duration-300 text-theme-text-primary focus:ring-1 focus:ring-theme-text-primary/10 focus:shadow-[0_0_15px_rgba(255,255,255,0.04)]"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-theme-text-muted">
                  <span>Expiration Code:</span>
                  <span className={`font-semibold ${timer < 60 ? "text-red-400 animate-pulse" : "text-cyan-400"}`}>
                    {formatTime(timer)}
                  </span>
                </div>

                <AuthButton type="submit" loading={loading} loadingText="Verifying Node...">
                  <span>Authorize Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </AuthButton>

                <div className="text-center text-xs text-theme-text-secondary">
                  Didn't catch the signal?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || loading}
                    className={`font-semibold underline outline-none ${
                      canResend 
                        ? "text-theme-text-primary cursor-pointer hover:text-white" 
                        : "text-theme-text-muted cursor-not-allowed"
                    }`}
                  >
                    Resend Signal
                  </button>
                </div>
              </form>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center"
          >
            <AuthCard>
              <div className="flex flex-col items-center justify-center py-6 gap-5">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="text-emerald-400"
                >
                  <CheckCircle2 className="w-16 h-16" />
                </motion.div>
                
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-display font-bold text-theme-text-primary tracking-tight">
                    Signal Verified
                  </h2>
                  <p className="text-xs text-theme-text-muted max-w-xs mx-auto">
                    Encryption handshakes resolved. Linking secure credentials stream now.
                  </p>
                </div>

                <div className="w-24 h-1.5 bg-theme-secondary/30 rounded-full overflow-hidden relative mt-2">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute w-1/2 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
