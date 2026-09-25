"use client";

import React, { useState } from "react";
import { Application, QuestionAnswer } from "../lib/mock-data";
import {
  X,
  ShieldCheck,
  Check,
  Building,
  FileText,
  AlertTriangle,
  Zap,
} from "./icons";

interface HumanReviewModalProps {
  application: Application | null;
  onClose: () => void;
  onApproveAndSubmit: (appId: string, updatedQuestions: QuestionAnswer[]) => void;
  onSkipApplication: (appId: string) => void;
}

export function HumanReviewModal({
  application,
  onClose,
  onApproveAndSubmit,
  onSkipApplication,
}: HumanReviewModalProps) {
  const [questions, setQuestions] = useState<QuestionAnswer[]>(
    application ? [...application.questions] : []
  );

  if (!application) return null;

  const handleAnswerChange = (qId: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, aiProposedValue: value } : q))
    );
  };

  const handleApprove = () => {
    onApproveAndSubmit(application.id, questions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/[0.12] bg-[#10121a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#161924] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Human-in-the-Loop Approval Gate
                </h3>
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  {application.atsProvider}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {application.company.name} &middot; {application.jobTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Informational Callout */}
        <div className="border-b border-white/[0.08] bg-amber-500/5 px-6 py-3 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <span>
            Autonomous execution paused. JobPilot requires human verification on custom questions before dispatching the final payload to {application.company.name}&apos;s ATS.
          </span>
        </div>

        {/* Scrollable Questions Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                q.isFlaggedForReview
                  ? "border-amber-500/30 bg-[#161924] ring-1 ring-amber-500/20 shadow-card-dark"
                  : "border-white/[0.08] bg-[#0c0e15]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1c202e] font-mono text-[10px] font-bold text-zinc-300">
                    {index + 1}
                  </span>
                  <label className="text-xs font-semibold text-zinc-200">
                    {q.label}
                  </label>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {Math.round(q.confidence * 100)}% match
                  </span>
                  {q.isFlaggedForReview && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/25">
                      Review Needed
                    </span>
                  )}
                </div>
              </div>

              {q.reviewReason && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Flag reason: {q.reviewReason}
                </p>
              )}

              {/* Editable input / textarea */}
              {q.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={q.aiProposedValue}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-mono"
                  placeholder="Enter or adjust your answer..."
                />
              ) : (
                <input
                  type="text"
                  value={q.aiProposedValue}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="Enter or adjust your answer..."
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161924] px-6 py-3.5 rounded-b-2xl">
          <button
            onClick={() => {
              onSkipApplication(application.id);
              onClose();
            }}
            className="text-xs font-medium text-zinc-400 hover:text-rose-400 transition-colors"
          >
            Skip this Application
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] bg-[#10121a] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#1f2434] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 active:scale-[0.98] shadow-glow-emerald transition-all"
            >
              <Check size={14} />
              <span>Approve & Dispatch Playwright Worker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
