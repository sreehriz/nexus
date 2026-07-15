import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import CinematicBackground from "../components/CinematicBackground";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide when creating an account (name, email, password), and information generated when you use Nexus (meeting metadata, chat messages, attendance records). We do not sell your data to third parties.`,
  },
  {
    title: "2. How We Use Your Data",
    content: `Your data is used to provide and improve the Nexus service, including powering Nexus Memory™ (searchable meeting history), generating AI summaries, and enabling real-time collaboration features.`,
  },
  {
    title: "3. Data Storage and Security",
    content: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Meeting rooms use end-to-end WebRTC encryption. We perform regular security audits and follow industry best practices for data protection.`,
  },
  {
    title: "4. Data Retention",
    content: `Meeting transcripts and memory data are retained for 24 months by default. You may delete your data at any time from your Profile settings. Account deletion permanently removes all associated data within 30 days.`,
  },
  {
    title: "5. Third-Party Services",
    content: `Nexus uses Google Gemini for AI features (transcription, translation, summarization) and optionally Supabase for authentication. These services have their own privacy policies.`,
  },
  {
    title: "6. Your Rights",
    content: `You have the right to access, correct, export, or delete your personal data. To exercise these rights, contact us or use the account management tools in your profile.`,
  },
  {
    title: "7. Cookies",
    content: `Nexus uses only essential cookies for session management and authentication. We do not use tracking cookies or third-party analytics cookies.`,
  },
  {
    title: "8. Changes to This Policy",
    content: `We may update this policy as Nexus evolves. Significant changes will be communicated via email or in-app notification.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text-primary overflow-x-hidden">
      <CinematicBackground theme="dark" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-theme-text-muted hover:text-theme-text-primary transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-10"
        >
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-theme-border/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-theme-text-secondary" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                Legal · Privacy
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-theme-text-primary">
              Privacy Policy
            </h1>
            <p className="text-sm text-theme-text-secondary">
              Last updated: January 2026 · Nexus Technologies
            </p>
            <p className="text-sm text-theme-text-secondary leading-relaxed">
              At Nexus, your privacy is fundamental. This policy explains how we collect, use, and protect your data when you use the Nexus platform.
            </p>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-theme-text-primary">{section.title}</h2>
                <p className="text-sm text-theme-text-secondary leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-theme-border/20 flex flex-col gap-3">
            <p className="text-xs text-theme-text-muted">
              For privacy-related questions, contact: privacy@nexus.app
            </p>
            <Link to="/terms" className="text-xs text-theme-text-muted hover:text-theme-text-primary transition-colors underline">
              Read our Terms of Service →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
