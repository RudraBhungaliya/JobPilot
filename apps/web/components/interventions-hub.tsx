"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building2,
  Key,
  HelpCircle,
  FileCheck,
  Send,
  SlidersHorizontal,
} from "lucide-react";

export interface InterventionApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  location?: string;
  salaryRange?: string;
  status: string;
  failureReason?: string;
  checkpointUrl?: string;
  sourceUrl?: string;
  atsProvider?: string;
  matchScore?: number;
  tier?: string;
  prefilledFields?: Array<{ label: string; value: string }>;
  questions?: Array<{ id: string; label: string; field?: string; type?: string; aiProposedValue?: string }>;
  verificationType?: string;
  pausedAt?: string;
}

interface InterventionsHubProps {
  applications: any[];
  onResolveCheckpoint: (appId: string, answers: Record<string, any>) => Promise<void>;
  onRefresh?: () => void;
  onOpenDirectCheckpoint?: (appId: string) => void;
}

export function InterventionsHub({
  applications,
  onResolveCheckpoint,
  onRefresh,
  onOpenDirectCheckpoint,
}: InterventionsHubProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Filter paused / waiting applications in real-time
  const waitingApps = applications.filter(
    (app) =>
      app.status === "WAITING_FOR_USER" ||
      app.status === "NEEDS_INTERVENTION" ||
      app.status === "VERIFICATION_PENDING" ||
      (Array.isArray(app.humanActions) && app.humanActions.some((h: any) => h.status === "PENDING" || h.status === "WAITING_FOR_USER"))
  );

  const classifyIntervention = (app: any): { type: string; label: string; color: string; icon: any } => {
    const reason = (app.failureReason || app.reason || app.humanActions?.[0]?.title || "").toLowerCase();
    if (reason.includes("captcha") || reason.includes("cloudflare") || reason.includes("turnstile") || reason.includes("security")) {
      return {
        type: "CAPTCHA",
        label: "Security Checkpoint / CAPTCHA",
        color: "bg-red-500/15 text-red-400 border-red-500/30",
        icon: ShieldAlert,
      };
    }
    if (reason.includes("2fa") || reason.includes("otp") || reason.includes("passcode") || reason.includes("two-factor")) {
      return {
        type: "2FA",
        label: "2FA / One-Time Passcode",
        color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        icon: Key,
      };
    }
    if (reason.includes("approval") || reason.includes("review")) {
      return {
        type: "APPROVAL",
        label: "Final Pre-Submission Review",
        color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        icon: FileCheck,
      };
    }
    return {
      type: "QUESTIONS",
      label: "Custom Employer Questions",
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: HelpCircle,
    };
  };

  const filteredApps = waitingApps.filter((app) => {
    if (filterType === "ALL") return true;
    const classification = classifyIntervention(app);
    return classification.type === filterType;
  });

  const handleQuickResolve = async (appId: string) => {
    setResolvingId(appId);
    try {
      await onResolveCheckpoint(appId, {
        security_checkpoint_verified: true,
        action: "CONFIRMED_CONTINUE",
        resolvedAt: new Date().toISOString(),
      });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Metrics Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-[#10131d] to-[#0a0d16] p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Human Interventions Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {waitingApps.length} Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                When the autonomous Playwright agent encounters anti-bot security challenges, CAPTCHAs, or employer custom questions, execution pauses safely. Review and resolve below to resume the pipeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.08]">
          <div className="bg-[#121622]/80 rounded-xl p-3 border border-white/[0.06]">
            <span className="text-[11px] font-medium text-slate-400">Total Interventions</span>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{waitingApps.length}</div>
          </div>
          <div className="bg-[#121622]/80 rounded-xl p-3 border border-white/[0.06]">
            <span className="text-[11px] font-medium text-amber-400">Security / CAPTCHAs</span>
            <div className="text-xl font-bold text-amber-300 mt-0.5 font-mono">
              {waitingApps.filter((a) => classifyIntervention(a).type === "CAPTCHA").length}
            </div>
          </div>
          <div className="bg-[#121622]/80 rounded-xl p-3 border border-white/[0.06]">
            <span className="text-[11px] font-medium text-blue-400">2FA & Passcodes</span>
            <div className="text-xl font-bold text-blue-300 mt-0.5 font-mono">
              {waitingApps.filter((a) => classifyIntervention(a).type === "2FA").length}
            </div>
          </div>
          <div className="bg-[#121622]/80 rounded-xl p-3 border border-white/[0.06]">
            <span className="text-[11px] font-medium text-emerald-400">Avg Playwright Fill</span>
            <div className="text-xl font-bold text-emerald-300 mt-0.5 font-mono">85% Complete</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: "ALL", label: `All Interventions (${waitingApps.length})` },
          { key: "CAPTCHA", label: "Security & CAPTCHAs" },
          { key: "QUESTIONS", label: "Custom Questions" },
          { key: "2FA", label: "2FA & Passcodes" },
          { key: "APPROVAL", label: "Submission Approval" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === tab.key
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.05]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No Interventions Currently Pending</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All applications in your pipeline are either running automatically or completed. When an employer asks an unanswerable question or presents a CAPTCHA, it will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => {
            const classification = classifyIntervention(app);
            const Icon = classification.icon;
            const companyName = app.company?.name || app.companyName || "Company";
            const jobTitle = app.jobTitle || app.title || "Software Engineer";
            const portalUrl = app.checkpointUrl || app.jobUrl || app.canonicalUrl || app.url;
            const checkpointId = app.id;

            return (
              <div
                key={app.id}
                className="group relative rounded-2xl border border-white/[0.08] bg-[#0d101b] hover:border-amber-500/30 transition-all p-5 shadow-lg space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white border border-white/[0.1] font-bold text-sm shrink-0">
                      {companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                          {jobTitle}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 ${classification.color}`}>
                          <Icon className="w-3 h-3" />
                          <span>{classification.label}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-medium text-slate-300">{companyName}</span>
                        {app.location && <span>• {app.location}</span>}
                        {app.atsProvider && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                            ATS: {app.atsProvider}
                          </span>
                        )}
                        {app.matchScore && (
                          <span className="text-emerald-400 font-mono font-semibold">
                            ★ {app.matchScore}% Match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      PAUSED - ACTION NEEDED
                    </span>
                  </div>
                </div>

                {/* Reason Banner */}
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-amber-200">
                      Checkpoint Trigger Reason:
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {app.failureReason || app.reason || "Autonomous automation reached verification check. Human approval required to complete."}
                    </div>
                  </div>
                </div>

                {/* Half-Filled Progress Bar */}
                <div className="bg-[#121624] rounded-xl p-3 border border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">Half-Filled Status:</strong> Playwright completed applicant profile, contact details, resume PDF upload, and standard questions.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    85% Autofilled
                  </span>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {portalUrl && (
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white border border-white/[0.08] transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Career Portal Page</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Primary Button: Navigate directly to the half-filled checkpoint page */}
                    <Link
                      href={`/checkpoint/${checkpointId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 transition cursor-pointer"
                    >
                      <span>Fix & Continue Application</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Quick Resume Button */}
                    <button
                      disabled={resolvingId === app.id}
                      onClick={() => handleQuickResolve(app.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                    >
                      {resolvingId === app.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Resuming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Quick Resume</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InterventionsHub;
