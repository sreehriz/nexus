import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import CinematicBackground from "../components/CinematicBackground";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Nexus, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.`,
  },
  {
    title: "2. Eligibility",
    content: `You must be at least 16 years old to use Nexus. By creating an account, you confirm you meet this requirement and have the authority to accept these terms on behalf of yourself or your organization.`,
  },
  {
    title: "3. Account Responsibilities",
    content: `You are responsible for maintaining the security of your account credentials. You agree not to share your password, use another user's account without permission, or engage in any unauthorized access to Nexus systems.`,
  },
  {
    title: "4. Acceptable Use",
    content: `You may not use Nexus for unlawful purposes, to harass or harm others, to distribute malware, to record meetings without participants' consent, or to violate any applicable laws or regulations.`,
  },
  {
    title: "5. Meeting Content",
    content: `You retain ownership of content you create in Nexus meetings. By using the Nexus Memory™ feature, you grant Nexus a limited license to index and search your meeting content to provide the service.`,
  },
  {
    title: "6. Service Availability",
    content: `Nexus is provided "as is" and we do not guarantee 100% uptime. We will make reasonable efforts to maintain service availability and notify users of planned maintenance.`,
  },
  {
    title: "7. Intellectual Property",
    content: `The Nexus platform, including its design, branding, AI features, and codebase, is the intellectual property of Nexus Technologies. You may not copy, modify, or distribute any part of the platform without permission.`,
  },
  {
    title: "8. Termination",
    content: `We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time via your profile settings.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the maximum extent permitted by law, Nexus shall not be liable for indirect, incidental, or consequential damages arising from your use of the service.`,
  },
  {
    title: "10. Changes to Terms",
    content: `We may update these terms as the platform evolves. Continued use of Nexus after changes are posted constitutes acceptance of the updated terms.`,
  },
];

export default function TermsPage() {
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
                <FileText className="w-5 h-5 text-theme-text-secondary" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-theme-text-muted">
                Legal · Terms
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-theme-text-primary">
              Terms of Service
            </h1>
            <p className="text-sm text-theme-text-secondary">
              Last updated: January 2026 · Nexus Technologies
            </p>
            <p className="text-sm text-theme-text-secondary leading-relaxed">
              These Terms of Service govern your use of Nexus. Please read them carefully before using the platform.
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
              For legal inquiries, contact: legal@nexus.app
            </p>
            <Link to="/privacy" className="text-xs text-theme-text-muted hover:text-theme-text-primary transition-colors underline">
              Read our Privacy Policy →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
