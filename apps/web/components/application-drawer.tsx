"use client";

import React, { useState } from "react";
import { Application, PIPELINE_STAGES, getTierColor, getTierLabel, GREENHOUSE_REJECTION_REASONS } from "../lib/mock-data";
import {
  X,
  ExternalLink,
  ShieldCheck,
  FileText,
  MapPin,
  Clock,
  CheckCircle,
  Building,
  Cpu,
  ChevronRight,
  Zap,
  Star,
  Award,
  XCircle,
  Activity,
  User,
} from "./icons";

interface ApplicationDrawerProps {
  application: Application | null;
  onClose: () => void;
  onOpenReviewModal: (app: Application) => void;
  onOpenTelemetryModal: (app: Application) => void;
  onAdvanceStage: (appId: string) => void;
  onRejectApplication?: (appId: string, reason: string) => void;
}

export function ApplicationDrawer({
  application,
  onClose,
  onOpenReviewModal,
  onOpenTelemetryModal,
  onAdvanceStage,
  onRejectApplication,
}: ApplicationDrawerProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "scorecard" | "resume" | "timeline">("fields");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>(GREENHOUSE_REJECTION_REASONS[0]);

  if (!application) return null;

  const isReviewPending = application.status === "WAITING_FOR_USER";
  const tierColors = getTierColor(application.company.tier);
  const stageOrder = ["SAVED", "TAILORING", "WAITING_FOR_USER", "QUEUED", "RUNNING", "SUBMITTED", "INTERVIEW", "OFFER"];
  const currentStageIndex = stageOrder.indexOf(application.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/[0.08] bg-[#10121a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Top Header with Tier & ATS Info */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#161924]">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border font-mono text-xs font-bold text-zinc-100 ${tierColors.bg} ${tierColors.border} ${tierColors.glow}`}>
              {application.company.logoText}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  {application.company.name}
                </h2>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold border ${tierColors.bg} ${tierColors.text} ${tierColors.border}`}>
                  {getTierLabel(application.company.tier)}
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                  {application.atsProvider} ATS
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{application.jobTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#10121a] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-white/[0.16] transition-colors"
            >
              <span>Greenhouse Source</span>
              <ExternalLink size={12} />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Greenhouse Stage Progression Milestone Breadcrumbs */}
        <div className="border-b border-white/[0.08] bg-[#0c0e15] px-6 py-3">
          <div className="flex items-center justify-between gap-1 overflow-x-auto text-[11px] pb-1">
            {[
              { id: "SAVED", label: "1. Review" },
              { id: "TAILORING", label: "2. Tailor" },
              { id: "WAITING_FOR_USER", label: "3. Gate" },
              { id: "QUEUED", label: "4. Queue" },
              { id: "SUBMITTED", label: "5. Applied" },
              { id: "INTERVIEW", label: "6. Interview" },
              { id: "OFFER", label: "7. Offer" },
            ].map((step, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = application.status === step.id || (step.id === "QUEUED" && application.status === "RUNNING");
              return (
                <div key={step.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[10px] font-medium transition-colors ${
                      isCurrent
                        ? "bg-blue-600 text-white font-semibold shadow-glow-blue"
                        : isPast
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-[#161924] text-zinc-500"
                    }`}
                  >
                    {isPast && <CheckCircle size={10} className="text-emerald-400" />}
                    <span>{step.label}</span>
                  </div>
                  {idx < 6 && <ChevronRight size={11} className="text-zinc-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-4 divide-x divide-white/[0.08] border-b border-white/[0.08] bg-[#10121a] px-6 py-2.5 text-xs">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Match Score</span>
            <div className="flex items-center gap-1.5 pt-0.5 font-semibold text-emerald-400">
              <span className="font-mono text-sm">{application.matchScore}%</span>
              <span className="text-[10px] text-zinc-400">Priority Fit</span>
            </div>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Target Comp</span>
            <p className="pt-0.5 font-medium text-zinc-200 truncate">{application.salaryRange}</p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Location & Mode</span>
            <p className="pt-0.5 font-medium text-zinc-300 truncate">{application.location}</p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Greenhouse Status</span>
            <div className="pt-0.5 font-semibold text-blue-400 truncate">
              {application.status}
            </div>
          </div>
        </div>

        {/* Review Required Alert Bar */}
        {isReviewPending && (
          <div className="flex items-center justify-between border-b border-amber-500/25 bg-amber-500/10 px-6 py-3 text-xs text-amber-400">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} />
              <div>
                <span className="font-semibold block text-amber-300">Human Approval Gate Active</span>
                <p className="text-[11px] text-amber-400/80">
                  {application.humanActions[0]?.title || "Form questions need your approval before submission to Greenhouse."}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenReviewModal(application)}
              className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 shadow-sm transition-colors shrink-0"
            >
              Review & Sign Off
            </button>
          </div>
        )}

        {/* Rejection Notice if rejected */}
        {application.status === "REJECTED" && (
          <div className="flex items-center justify-between border-b border-rose-500/25 bg-rose-500/10 px-6 py-3 text-xs text-rose-400">
            <div className="flex items-center gap-2.5">
              <XCircle size={18} />
              <div>
                <span className="font-semibold block text-rose-300">Archived Opportunity</span>
                <p className="text-[11px] text-rose-400/80">
                  Reason: {application.rejectionReason || "Position closed / Not selected"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Tabs */}
        <div className="flex border-b border-white/[0.08] bg-[#0c0e15] px-6 text-xs">
          <button
            onClick={() => setActiveTab("fields")}
            className={`border-b-2 py-3 font-medium transition-colors ${
              activeTab === "fields"
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ATS Form Mapping ({application.questions.length || 3})
          </button>
          <button
            onClick={() => setActiveTab("scorecard")}
            className={`border-b-2 py-3 ml-6 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "scorecard"
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Star size={12} className={application.scorecard ? "text-amber-400" : "text-zinc-500"} />
            <span>Greenhouse Scorecard</span>
            {application.scorecard && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono text-amber-400">
                {application.scorecard.score}/5
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("resume")}
            className={`border-b-2 py-3 ml-6 font-medium transition-colors ${
              activeTab === "resume"
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Resume & Keywords
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`border-b-2 py-3 ml-6 font-medium transition-colors ${
              activeTab === "timeline"
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
          {/* Tab 1: Form Mapping */}
          {activeTab === "fields" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3 text-zinc-300 leading-relaxed">
                The agent mapped candidate profile fields to <span className="font-semibold text-zinc-100">{application.company.name}</span>&apos;s verified {application.atsProvider} application schema.
              </div>

              {application.questions.length > 0 ? (
                application.questions.map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                      q.isFlaggedForReview
                        ? "border-amber-500/30 bg-[#161924]"
                        : "border-white/[0.08] bg-[#0c0e15]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-zinc-100">{q.label}</label>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {Math.round(q.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <p className="rounded-lg bg-[#090a0f] p-2.5 font-mono text-[11px] text-zinc-300 leading-relaxed border border-white/[0.05]">
                      {q.aiProposedValue}
                    </p>

                    {q.isFlaggedForReview && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
                        <ShieldCheck size={12} />
                        <span>{q.reviewReason || "Flagged for candidate confirmation"}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-4 space-y-3">
                  <div className="font-semibold text-zinc-100">Standard Greenhouse Field Mappings</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-[#0c0e15] rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-500 block text-[10px]">Full Name</span>
                      <span className="font-medium text-zinc-200">Alex Rivera</span>
                    </div>
                    <div className="p-2.5 bg-[#0c0e15] rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-500 block text-[10px]">Email Address</span>
                      <span className="font-medium text-zinc-200">alex.rivera@eng-lead.io</span>
                    </div>
                    <div className="p-2.5 bg-[#0c0e15] rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-500 block text-[10px]">Work Authorization</span>
                      <span className="font-medium text-zinc-200">US Citizen</span>
                    </div>
                    <div className="p-2.5 bg-[#0c0e15] rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-500 block text-[10px]">LinkedIn URL</span>
                      <span className="font-medium text-zinc-200">linkedin.com/in/alex-rivera-systems</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Greenhouse Scorecard */}
          {activeTab === "scorecard" && (
            <div className="space-y-4">
              {application.scorecard ? (
                <div className="space-y-4">
                  {/* Overall Recommendation Banner */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                          <Award size={18} />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-amber-400">Greenhouse Scorecard Decision</span>
                          <h4 className="text-sm font-bold text-zinc-100">{application.scorecard.overallRecommendation}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-[#10121a] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={star <= application.scorecard!.score ? "text-amber-400 fill-amber-400" : "text-zinc-700"}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-amber-500/20">
                      <span>Interviewer: {application.scorecard.interviewer}</span>
                      <span className="font-mono text-[10px]">{application.scorecard.submittedAt}</span>
                    </div>
                  </div>

                  {/* Attribute Ratings Breakdown */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-4 space-y-3">
                    <h4 className="font-semibold text-zinc-100">Greenhouse Competency Ratings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Technical Competence</span>
                          <span className="font-mono font-bold text-emerald-400">{application.scorecard.technicalCompetence}/5</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(application.scorecard.technicalCompetence / 5) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">System Architecture</span>
                          <span className="font-mono font-bold text-emerald-400">{application.scorecard.systemDesign}/5</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(application.scorecard.systemDesign / 5) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Communication & Clarity</span>
                          <span className="font-mono font-bold text-blue-400">{application.scorecard.communication}/5</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(application.scorecard.communication / 5) * 100}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-400">Culture Add & Collaboration</span>
                          <span className="font-mono font-bold text-purple-400">{application.scorecard.cultureAdd}/5</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(application.scorecard.cultureAdd / 5) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Strengths */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2">
                    <h4 className="font-semibold text-zinc-100">Key Strengths Highlighted</h4>
                    <div className="space-y-1.5">
                      {application.scorecard.keyStrengths.map((strength, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-300">
                          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                          <span>{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interviewer Notes */}
                  <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2">
                    <h4 className="font-semibold text-zinc-100">Panel Debrief Notes</h4>
                    <p className="rounded-lg bg-[#090a0f] p-3 text-[11px] text-zinc-300 leading-relaxed border border-white/[0.05]">
                      &ldquo;{application.scorecard.notes}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#10121a] p-8 text-center space-y-2">
                  <Award size={28} className="mx-auto text-zinc-600" />
                  <h4 className="font-semibold text-zinc-300">No Scorecard Filed Yet</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Scorecards are filed by interviewers once the candidate reaches the Technical Assessment or Onsite Loop stages.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Resume */}
          {activeTab === "resume" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 shadow-card-dark">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-100">
                      {application.resumeVersionUsed}
                    </h4>
                    <span className="text-[11px] text-zinc-500">Tailored for {application.company.name} ({application.atsProvider})</span>
                  </div>
                </div>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Verified ATS PDF
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2">
                <h4 className="font-semibold text-zinc-100">Targeted Keywords & Skill Matrix</h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {application.tailoringNotes.highlightedSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-white/[0.08] bg-[#161924] px-2.5 py-1 text-[11px] font-medium text-zinc-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2">
                <h4 className="font-semibold text-zinc-100">Tailored Executive Summary</h4>
                <p className="rounded-lg bg-[#090a0f] p-3 text-[11px] text-zinc-300 leading-relaxed border border-white/[0.05]">
                  &ldquo;{application.tailoringNotes.customExecutiveSummary}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Log */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                {application.telemetryLogs.map((log, idx) => (
                  <div key={idx} className="relative space-y-0.5">
                    <div
                      className={`absolute -left-6 top-1 h-2 w-2 rounded-full ring-4 ring-[#10121a] ${
                        log.level === "SUCCESS"
                          ? "bg-emerald-400"
                          : log.level === "WARN"
                          ? "bg-amber-400"
                          : "bg-blue-400"
                      }`}
                    ></div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-500">{log.timestamp}</span>
                      <span className="rounded bg-[#161924] px-1.5 py-0.2 font-mono text-[9px] font-semibold text-zinc-300 border border-white/[0.05]">
                        {log.step}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">{log.detail}</p>
                  </div>
                ))}
              </div>

              {application.confirmationCode && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  <span className="font-semibold block">Greenhouse Receipt Token Verified</span>
                  <span className="font-mono text-[11px]">Token ID: {application.confirmationCode}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Bottom Greenhouse Action Bar */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161924] px-6 py-3.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenTelemetryModal(application)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#10121a] px-3 py-1.5 font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <Cpu size={14} />
              <span>Telemetry</span>
            </button>

            {application.status !== "REJECTED" && (
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <XCircle size={14} />
                <span>Archive / Reject</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {application.status !== "OFFER" && application.status !== "REJECTED" && (
              <button
                onClick={() => onAdvanceStage(application.id)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-500 shadow-glow-blue transition-all active:scale-[0.98]"
              >
                <span>Advance to Next Stage</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Rejection Reason Modal */}
        {isRejectModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#10121a] p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400">
                  <XCircle size={18} />
                  <h3 className="font-semibold text-zinc-100">Greenhouse Rejection Notice</h3>
                </div>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Select the rejection reason code for <span className="text-zinc-200 font-semibold">{application.company.name}</span>. This updates your analytics and pauses automated follow-ups.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-300">Reason Code</label>
                <select
                  value={selectedRejectReason}
                  onChange={(e) => setSelectedRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                >
                  {GREENHOUSE_REJECTION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="rounded-lg border border-white/[0.08] px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onRejectApplication) {
                      onRejectApplication(application.id, selectedRejectReason);
                    }
                    setIsRejectModalOpen(false);
                  }}
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
