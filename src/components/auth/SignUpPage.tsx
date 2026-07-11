import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User, AtSign, ArrowRight, ArrowLeft, Check, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AuthCard from "./AuthCard";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import SocialLoginButton from "./SocialLoginButton";

const signUpSchema = z.object({
  fullName: z.string().min(1, "Please enter your full name"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric or contain underscores")
    .toLowerCase(),
  email: z
    .string()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

const PRESET_AVATARS = [
  { id: "avatar-1", label: "Solar Flare", gradient: "from-[#FF416C] to-[#FF4B2B]" },
  { id: "avatar-2", label: "Aurora Green", gradient: "from-[#11998E] to-[#38EF7D]" },
  { id: "avatar-3", label: "Deep Matrix", gradient: "from-[#00C6FF] to-[#0072FF]" },
  { id: "avatar-4", label: "Violet Plasma", gradient: "from-[#7F00FF] to-[#E100FF]" },
  { id: "avatar-5", label: "Apex Amber", gradient: "from-[#F12711] to-[#F5AF19]" },
];

const INTERESTS = [
  "Collaboration",
  "Design Systems",
  "AI Pipelines",
  "WebRTC Streams",
  "Security Layers",
  "Product Dev"
];

interface SignUpPageProps {
  onNavigate: (view: "landing" | "signin" | "signup" | "forgot") => void;
  onSuccess: (name: string) => void;
}

export default function SignUpPage({ onNavigate, onSuccess }: SignUpPageProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    getValues,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
  });

  const handleNextStep = async () => {
    // Validate current fields before stepping forward
    const isValid = await trigger(["fullName", "username", "email", "password", "confirmPassword"]);
    if (isValid) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleFormSubmit = async () => {
    setLoading(true);
    setErrorMessage("");

    const data = getValues();

    // Simulate database write
    setTimeout(() => {
      setLoading(false);
      if (data.email.toLowerCase() === "error@nexus.com") {
        setErrorMessage("This email address is already in use by another node.");
        setStep(1); // Return to step 1 to correct input
      } else {
        onSuccess(data.fullName);
      }
    }, 2000);
  };

  const currentAvatarGrad = PRESET_AVATARS.find((a) => a.id === selectedAvatar)?.gradient || "from-theme-surface to-theme-secondary";

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[calc(100vh-140px)]">
      {/* Left Column: Brand Info / Status (Hidden on Mobile) */}
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
            Create Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-text-primary via-theme-text-muted to-theme-text-primary/40">
              Conferencing Node
            </span>
          </h1>
          <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed max-w-md font-normal">
            Join the ecosystem of elite remote workspaces. Configure your communication parameters and link securely.
          </p>
        </div>

        {/* Step Progress indicators */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold ${
              step === 1 ? "bg-theme-text-primary text-theme-bg border-transparent" : "border-emerald-500 text-emerald-500"
            }`}>
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
            </span>
            <span className={step === 1 ? "text-theme-text-primary" : "text-theme-text-muted"}>Credentials</span>
          </div>
          <div className="h-px bg-theme-border/20 w-12" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold ${
              step === 2 ? "bg-theme-text-primary text-theme-bg border-transparent" : "border-theme-border/60 text-theme-text-muted"
            }`}>
              2
            </span>
            <span className={step === 2 ? "text-theme-text-primary" : "text-theme-text-muted"}>Profile Setup</span>
          </div>
        </div>
      </motion.div>

      {/* Right Column: Multi-step AuthCard */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="col-span-1 lg:col-span-6 flex justify-center"
      >
        <AuthCard>
          <div className="text-center md:text-left flex flex-col gap-2">
            <h2 className="text-2xl font-display font-bold text-theme-text-primary tracking-tight">
              {step === 1 ? "Create Account" : "Customize Profile"}
            </h2>
            <p className="text-xs text-theme-text-muted">
              {step === 1 ? "Start your connection to the Nexus network." : "Personalize your collaboration matrix."}
            </p>
          </div>

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

          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* Step 1: Input Fields */
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                <AuthInput
                  {...register("fullName")}
                  label="Full Name"
                  type="text"
                  icon={<User className="w-4.5 h-4.5" />}
                  placeholder="Enter your full name"
                  error={errors.fullName?.message}
                  disabled={loading}
                />

                <AuthInput
                  {...register("username")}
                  label="Username"
                  type="text"
                  icon={<AtSign className="w-4.5 h-4.5" />}
                  placeholder="Choose your Nexus username"
                  error={errors.username?.message}
                  disabled={loading}
                />

                <AuthInput
                  {...register("email")}
                  label="Email Address"
                  type="email"
                  icon={<Mail className="w-4.5 h-4.5" />}
                  placeholder="Enter your email address"
                  error={errors.email?.message}
                  disabled={loading}
                />

                <AuthInput
                  {...register("password")}
                  label="Password"
                  type="password"
                  icon={<Lock className="w-4.5 h-4.5" />}
                  placeholder="Create a secure password"
                  error={errors.password?.message}
                  disabled={loading}
                />

                <AuthInput
                  {...register("confirmPassword")}
                  label="Confirm Password"
                  type="password"
                  icon={<Lock className="w-4.5 h-4.5" />}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  disabled={loading}
                />

                <AuthButton
                  type="button"
                  onClick={handleNextStep}
                  className="mt-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </AuthButton>

                {/* Social Login Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px bg-theme-border/20 flex-1" />
                  <span className="text-[9px] font-mono uppercase tracking-wider text-theme-text-muted select-none">
                    Or secure sign up
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              </motion.div>
            ) : (
              /* Step 2: Avatar Upload & Interests Customization */
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5 text-left"
              >
                {/* Simulated Avatar Selection Uploader */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted font-medium">
                    Profile Avatar
                  </span>
                  <div className="flex items-center gap-5">
                    {/* Big active avatar badge */}
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${currentAvatarGrad} flex items-center justify-center border border-theme-border/50 shadow-lg text-theme-bg text-xl font-bold uppercase`}>
                      {getValues("fullName")?.split(" ").map((n) => n[0]).join("") || "N"}
                    </div>
                    
                    {/* Horizontal slider list of other avatars */}
                    <div className="flex-1 flex gap-2 overflow-x-auto py-1">
                      {PRESET_AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${avatar.gradient} shrink-0 cursor-pointer border-2 transition-all relative ${
                            selectedAvatar === avatar.id
                              ? "border-theme-text-primary scale-105 shadow-md shadow-white/10"
                              : "border-transparent opacity-65 hover:opacity-100"
                          }`}
                          title={avatar.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interest selection tags/chips */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-theme-text-muted font-medium">
                    Select Focus Parameters (Optional)
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {INTERESTS.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleToggleInterest(interest)}
                          className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border outline-none ${
                            isSelected
                              ? "bg-theme-text-primary text-theme-bg border-transparent shadow-[0_2px_8px_rgba(255,255,255,0.06)]"
                              : "bg-theme-secondary/20 text-theme-text-secondary border-theme-border/50 hover:bg-theme-secondary/50 hover:border-theme-text-primary/30"
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nav buttons */}
                <div className="flex gap-3.5 mt-2">
                  <AuthButton
                    type="button"
                    variant="secondary"
                    onClick={handlePrevStep}
                    className="flex-1"
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </AuthButton>

                  <AuthButton
                    type="button"
                    onClick={handleSubmit(handleFormSubmit)}
                    loading={loading}
                    loadingText="Activating..."
                    className="flex-2"
                  >
                    <span>Create Node</span>
                    <Sparkles className="w-4 h-4" />
                  </AuthButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center text-[12px] font-sans text-theme-text-secondary mt-3">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate("signin")}
              className="text-theme-text-primary font-semibold hover:underline cursor-pointer outline-none"
              disabled={loading}
            >
              Sign In
            </button>
          </div>
        </AuthCard>
      </motion.div>
    </div>
  );
}
