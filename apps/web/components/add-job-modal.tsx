"use client";

import React, { useState } from "react";
import { ResumeVersion } from "../lib/domain-types";
import {
  X,
  Plus,
  ExternalLink,
  ShieldCheck,
  Building,
  FileText,
  MapPin,
  Sparkles,
  Zap,
  RefreshCw,
  CheckCircle,
} from "./icons";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: ResumeVersion[];
  onAddJob: (job: { id: string; title: string; companyName: string; url: string }) => void;
}

export function AddJobModal({
  isOpen,
  onClose,
  resumes,
  onAddJob,
}: AddJobModalProps) {
  const [url, setUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [selectedResume, setSelectedResume] = useState(resumes[0]?.name || "");
  const [ingestedJob, setIngestedJob] = useState<{ id: string; title: string; companyName: string; url: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time ATS detection based on URL
  const detectedAts = url.includes("greenhouse")
    ? "Greenhouse"
    : url.includes("ashby")
    ? "Ashby"
    : url.includes("lever")
    ? "Lever"
    : url.includes("workday")
    ? "Workday"
    : "Custom";

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setExtractionStatus(null);
  };

  const handleExtractFromUrl = async () => {
    if (!url.trim()) return;
    setIsExtracting(true);
    setExtractionStatus(null);
    try {
      const res = await fetch("/api/v1/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const persistedJob = d.data || d;
          const title = persistedJob.title || "";
          const company = persistedJob.company?.name || "";
          if (!persistedJob.id || !title || !company || !persistedJob.url) throw new Error("The provider response did not contain a persisted job record.");
          setIngestedJob({ id: persistedJob.id, title, companyName: company, url: persistedJob.url });
          setCompanyName(company);
          setJobTitle(title);
          setLocation(persistedJob.location || "");
          setSalaryRange(persistedJob.salaryRange || "");
          setExtractionStatus("Job was read from the source and saved to your account.");
        } else {
          throw new Error(json.message || "Job ingestion failed.");
        }
      } else {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.message || "Job ingestion failed.");
      }
    } catch (error) {
      setIngestedJob(null);
      setExtractionStatus(error instanceof Error ? error.message : "Job ingestion failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (!ingestedJob) return;
    onAddJob(ingestedJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="relative flex w-full max-w-lg flex-col rounded-2xl border border-white/[0.12] bg-[#10121a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#161924] rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Ingest Real-Time Job URL
              </h3>
              <span className="text-xs text-zinc-400">
                Playwright & ATS crawler auto-extracts live job metadata
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Target URL input with dynamic parser detection badge */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-200">
                Target Job Posting URL
              </label>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-blue-400 border border-blue-500/20">
                Detected: {detectedAts} ATS
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://jobs.ashbyhq.com/... or boards.greenhouse.io/..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1 rounded-lg border border-white/[0.1] bg-[#090a0f] p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleExtractFromUrl}
                disabled={!url || isExtracting}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={12} className={isExtracting ? "animate-spin text-blue-400" : ""} />
                <span>{isExtracting ? "Parsing..." : "Auto-Extract"}</span>
              </button>
            </div>
            {extractionStatus && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                <CheckCircle size={12} />
                <span>{extractionStatus}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-300">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Stripe, Linear"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-zinc-300">Role Title</label>
              <input
                type="text"
                placeholder="e.g. Staff Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-300">Location / Mode</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-zinc-300">Target Compensation</label>
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Attached Resume */}
          <div className="space-y-1">
            <label className="font-medium text-zinc-300">Vector Resume for ATS Tailoring</label>
            <select
              value={selectedResume}
              onChange={(e) => setSelectedResume(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.roleFocus})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161924] px-6 py-3.5 rounded-b-2xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] bg-[#10121a] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!ingestedJob}
              className="rounded-lg border border-white/[0.08] bg-[#10121a] px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-[#1f2434] transition-colors disabled:opacity-50"
            >
              Save to Board
            </button>
            <button
              onClick={handleSubmit}
              disabled={!ingestedJob}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 active:scale-[0.98] shadow-glow-blue transition-all disabled:opacity-50"
            >
              <Zap size={13} />
              <span>Queue Auto-Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
