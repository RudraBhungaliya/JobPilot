"use client";

import React from "react";
import { Application, PIPELINE_STAGES, getTierColor, getTierLabel, sortByTier, getStatusLabel } from "../lib/mock-data";
import {
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Cpu,
  FileText,
  Zap,
  Star,
  Award,
  XCircle,
} from "./icons";

interface PipelineBoardProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onOpenReviewModal: (app: Application) => void;
  onOpenTelemetryModal: (app: Application) => void;
  onMoveStage: (appId: string, newStage: Application["status"]) => void;
  onRejectApplication?: (appId: string) => void;
}

export function PipelineBoard({
  applications,
  onSelectApplication,
  onOpenReviewModal,
  onOpenTelemetryModal,
  onMoveStage,
  onRejectApplication,
}: PipelineBoardProps) {
  const stageOrder: Application["status"][] = [
    "SAVED",
    "TAILORING",
    "WAITING_FOR_USER",
    "QUEUED",
    "SUBMITTED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ];

  return (
    <div className="flex h-full w-full gap-3.5 overflow-x-auto pb-6 pt-1">
      {PIPELINE_STAGES.map((stage) => {
        const stageApps = sortByTier(
          applications.filter((app) => {
            if (stage.key === "QUEUED") {
              return app.status === "QUEUED" || app.status === "RUNNING";
            }
            return app.status === stage.key;
          })
        );

        const isReviewGate = stage.key === "WAITING_FOR_USER";
        const isRejected = stage.key === "REJECTED";
        const isOffer = stage.key === "OFFER";
        const isInterview = stage.key === "INTERVIEW";

        return (
          <div
            key={stage.key}
            className={`flex w-80 shrink-0 flex-col rounded-xl border transition-all ${
              isReviewGate
                ? "border-amber-500/35 bg-[#10121a] shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                : isOffer
                ? "border-cyan-500/35 bg-[#10121a] shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                : isInterview
                ? "border-purple-500/30 bg-[#10121a]"
                : isRejected
                ? "border-rose-500/20 bg-[#10121a]"
                : "border-white/[0.08] bg-[#0c0e15]"
            }`}
          >
            {/* Column Header */}
            <div
              className={`flex flex-col border-b px-3.5 py-3 ${
                isReviewGate
                  ? "border-amber-500/20 bg-amber-500/5"
                  : isOffer
                  ? "border-cyan-500/20 bg-cyan-500/5"
                  : isInterview
                  ? "border-purple-500/20 bg-purple-500/5"
                  : isRejected
                  ? "border-rose-500/15 bg-rose-500/5"
                  : "border-white/[0.08] bg-[#10121a]/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isReviewGate && <ShieldCheck size={14} className="text-amber-400" />}
                  {isOffer && <Award size={14} className="text-cyan-400" />}
                  {isInterview && <Star size={14} className="text-purple-400" />}
                  <h3
                    className={`text-xs font-semibold tracking-tight ${
                      isReviewGate
                        ? "text-amber-400"
                        : isOffer
                        ? "text-cyan-400"
                        : isInterview
                        ? "text-purple-400"
                        : isRejected
                        ? "text-rose-400"
                        : "text-zinc-200"
                    }`}
                  >
                    {stage.label}
                  </h3>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-medium ${
                    isReviewGate
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                      : isOffer
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                      : isInterview
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/25"
                      : isRejected
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                      : "bg-[#1c202e] text-zinc-400 border border-white/[0.05]"
                  }`}
                >
                  {stageApps.length}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 font-mono">{stage.desc}</span>
            </div>

            {/* Cards scroll area */}
            <div className="flex flex-1 flex-col gap-2.5 p-2.5 overflow-y-auto max-h-[calc(100vh-230px)]">
              {stageApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-12 text-center text-xs text-zinc-600">
                  <span>No candidates in stage</span>
                </div>
              ) : (
                stageApps.map((app) => {
                  const isPendingReview = app.status === "WAITING_FOR_USER";
                  const isRunning = app.status === "RUNNING";
                  const tierColors = getTierColor(app.company.tier);
                  const currentIdx = stageOrder.indexOf(app.status);
                  const nextStage = currentIdx < stageOrder.length - 2 ? stageOrder[currentIdx + 1] : null;

                  return (
                    <div
                      key={app.id}
                      onClick={() => onSelectApplication(app)}
                      className={`group relative flex flex-col gap-2.5 rounded-xl border bg-[#10121a] p-3.5 text-xs transition-all duration-150 hover:bg-[#141724] cursor-pointer ${
                        isPendingReview
                          ? "border-amber-500/40 ring-1 ring-amber-500/25 shadow-glow-amber/20"
                          : isRunning
                          ? "border-blue-500/40 ring-1 ring-blue-500/25 shadow-glow-blue/20"
                          : app.status === "OFFER"
                          ? "border-cyan-500/35 ring-1 ring-cyan-500/20"
                          : "border-white/[0.08] shadow-card-dark hover:border-white/[0.18]"
                      }`}
                    >
                      {/* Top row: Company & Tier + ATS badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-[11px] font-bold text-zinc-100 ${tierColors.bg} ${tierColors.border} ${tierColors.glow}`}>
                            {app.company.logoText}
                          </div>
                          <div>
                            <h4 className="font-semibold text-zinc-100 leading-tight group-hover:text-blue-400 transition-colors">
                              {app.company.name}
                            </h4>
                            <span className="text-[10px] text-zinc-500 block">
                              {app.company.stage}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${tierColors.bg} ${tierColors.text} ${tierColors.border} border`}
                          >
                            {app.company.tier}-Tier
                          </span>
                        </div>
                      </div>

                      {/* Job Title */}
                      <div className="text-xs font-semibold text-zinc-200 leading-snug line-clamp-2">
                        {app.jobTitle}
                      </div>

                      {/* Location & Salary */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-zinc-500" />
                          {app.location}
                        </span>
                        {app.salaryRange && app.salaryRange !== "Compensation not disclosed" && (
                          <>
                            <span className="text-zinc-600">&bull;</span>
                            <span className="font-medium text-emerald-400">
                              {app.salaryRange}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Greenhouse Scorecard Pill if present */}
                      {app.scorecard && (
                        <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] text-amber-300">
                          <div className="flex items-center gap-1 font-semibold">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>Scorecard: {app.scorecard.overallRecommendation}</span>
                          </div>
                          <span className="font-mono">{app.scorecard.score}/5.0</span>
                        </div>
                      )}

                      {/* ATS provider + Match score */}
                      <div className="flex items-center justify-between border-t border-white/[0.05] pt-2 text-[10px] text-zinc-500">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono font-medium ${
                            app.atsProvider === "Ashby"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : app.atsProvider === "Greenhouse"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : app.atsProvider === "Lever"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          }`}
                        >
                          {app.atsProvider}
                        </span>
                        <span className="rounded bg-[#161924] border border-white/[0.08] px-1.5 py-0.5 font-mono font-semibold text-emerald-400">
                          {app.matchScore}% Match
                        </span>
                      </div>

                      {/* Review Required Action */}
                      {isPendingReview && (
                        <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/25 p-2 text-amber-400">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium">
                            <ShieldCheck size={13} />
                            <span>Sign-off Required</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReviewModal(app);
                            }}
                            className="rounded bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-black hover:bg-amber-400 transition-colors shadow-sm"
                          >
                            Review & Sign Off
                          </button>
                        </div>
                      )}

                      {/* Running Indicator */}
                      {isRunning && (
                        <div className="mt-1 flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/25 p-2 text-blue-400">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></div>
                            <span>Submitting via Greenhouse...</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTelemetryModal(app);
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold text-blue-300 hover:text-white"
                          >
                            <Cpu size={12} />
                            <span>Logs</span>
                          </button>
                        </div>
                      )}

                      {/* Card Footer: Advance stage & timestamp */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.05]">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {app.lastUpdated}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {nextStage && app.status !== "REJECTED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveStage(app.id, nextStage);
                              }}
                              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all"
                              title="Advance to next stage"
                            >
                              <span>Advance</span>
                              <ChevronRight size={10} />
                            </button>
                          )}
                          <span className="group-hover:text-zinc-200 transition-colors text-[10px] font-medium">
                            Details &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
