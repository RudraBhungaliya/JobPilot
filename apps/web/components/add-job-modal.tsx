"use client";

import React, { useState } from "react";
import { Application, ResumeVersion, inferCompanyTier } from "../lib/mock-data";
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
} from "./icons";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: ResumeVersion[];
  onAddJob: (newApp: Partial<Application>) => void;
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
  const [location, setLocation] = useState("San Francisco, CA / Remote");
  const [salaryRange, setSalaryRange] = useState("$200,000 – $260,000");
  const [selectedResume, setSelectedResume] = useState(resumes[0]?.name || "");

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
    if (val.includes("stripe") && !companyName) {
      setCompanyName("Stripe");
      setJobTitle("Staff Software Engineer, Platform");
    } else if (val.includes("linear") && !companyName) {
      setCompanyName("Linear");
      setJobTitle("Product Engineer, Systems");
    } else if (val.includes("anthropic") && !companyName) {
      setCompanyName("Anthropic");
      setJobTitle("Systems Engineer, Safety Infrastructure");
    }
  };

  const handleSubmit = (status: "SAVED" | "QUEUED") => {
    if (!companyName || !jobTitle) return;

    onAddJob({
      jobTitle,
      company: {
        id: `c-${Date.now()}`,
        name: companyName,
        domain: `${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
        logoText: companyName.slice(0, 2).toUpperCase(),
        location,
        stage: "Growth / Tier 1",
        verifiedAts: detectedAts,
        tier: inferCompanyTier(companyName),
      },
      jobUrl: url || "https://example.com/careers/job",
      location,
      workMode: location.toLowerCase().includes("remote") ? "Remote" : "Hybrid",
      salaryRange,
      status,
      matchScore: Math.floor(Math.random() * 8) + 91,
      atsProvider: detectedAts,
      resumeVersionUsed: selectedResume,
      humanActions: [],
      questions: [],
      tailoringNotes: {
        highlightedSkills: ["Distributed Systems", "TypeScript", "Node.js", "Performance"],
        customExecutiveSummary: `Tailored application profile aligned with ${companyName}'s engineering culture.`,
        gapAnalysis: ["Fully matched candidate profile requirements."],
      },
      telemetryLogs: [
        {
          timestamp: new Date().toLocaleTimeString().slice(0, 5),
          level: "INFO",
          step: "INGEST",
          detail: `Ingested via manual job URL input. Detected ${detectedAts} ATS schema.`,
        },
      ],
    });

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
                Ingest Target Job URL
              </h3>
              <span className="text-xs text-zinc-400">
                Auto-detects Ashby, Greenhouse, Lever, and Workday forms
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
            <input
              type="url"
              placeholder="https://jobs.ashbyhq.com/... or boards.greenhouse.io/..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#090a0f] p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
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
              onClick={() => handleSubmit("SAVED")}
              disabled={!companyName || !jobTitle}
              className="rounded-lg border border-white/[0.08] bg-[#10121a] px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-[#1f2434] transition-colors disabled:opacity-50"
            >
              Save to Board
            </button>
            <button
              onClick={() => handleSubmit("QUEUED")}
              disabled={!companyName || !jobTitle}
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
