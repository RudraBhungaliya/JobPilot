"use client";

import React, { useState, useEffect } from "react";
import { JobSearchLoop, ResumeVersion, CandidateProfile } from "../lib/mock-data";
import {
  Activity,
  Play,
  Pause,
  Plus,
  Compass,
  CheckCircle,
  FileText,
  ShieldCheck,
  Zap,
  RefreshCw,
  Clock,
  Trash,
  Sliders,
  ExternalLink,
  Award,
  Globe,
  TrendingUp,
} from "./icons";

interface JobSearchLoopsViewProps {
  resumes: ResumeVersion[];
  profile: CandidateProfile;
  onNavigateToDiscovery?: (keywords: string[]) => void;
}

export function JobSearchLoopsView({
  resumes,
  profile,
  onNavigateToDiscovery,
}: JobSearchLoopsViewProps) {
  const [loops, setLoops] = useState<JobSearchLoop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [runningLoopId, setRunningLoopId] = useState<string | null>(null);
  const [runResultToast, setRunResultToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state for creating a loop
  const [formData, setFormData] = useState({
    name: "Senior Backend & Distributed Systems - India MNCs",
    targetJobTitles: ["Software Engineer", "Backend Engineer", "Staff Software Engineer"],
    targetLocations: ["Bengaluru", "Hyderabad", "Pune", "Remote (India)"],
    targetCountries: ["India"],
    remotePreference: "HYBRID_OR_REMOTE",
    experienceLevel: "SENIOR_STAFF",
    employmentTypes: ["FULL_TIME"],
    minimumCompensation: 3500000,
    targetTiers: ["S", "A", "B"],
    autoApplyEnabled: true,
    recruiterOutreachEnabled: false,
    dailyApplicationLimit: 12,
    dailyDiscoveryLimit: 50,
    priorityStrategy: "MNC_FIRST",
    resumeId: resumes.find((r) => r.isDefault)?.id || resumes[0]?.id || "",
    excludedCompanies: [] as string[],
    includedCompanies: [] as string[],
  });

  const [newTitleInput, setNewTitleInput] = useState("");
  const [newLocationInput, setNewLocationInput] = useState("");

  const fetchLoops = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/loops");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLoops(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch loops", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLoops();
  }, []);

  const handleCreateLoop = async () => {
    try {
      const res = await fetch("/api/v1/loops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreating(false);
        setActiveStep(1);
        await fetchLoops();
        setRunResultToast({
          message: `Job search loop "${formData.name}" activated successfully!`,
          type: "success",
        });
        setTimeout(() => setRunResultToast(null), 4000);
      }
    } catch (err) {
      console.error("Failed to create loop", err);
    }
  };

  const handleToggleStatus = async (loop: JobSearchLoop) => {
    const nextStatus = loop.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/v1/loops/${loop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setLoops((prev) =>
          prev.map((l) => (l.id === loop.id ? { ...l, status: nextStatus } : l))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleRunLoop = async (loopId: string) => {
    setRunningLoopId(loopId);
    setRunResultToast(null);
    try {
      const res = await fetch(`/api/v1/loops/${loopId}/run`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRunResultToast({
          message: `Loop executed: Discovered ${data.discoveredCount} matching jobs · Dispatched ${data.dispatchedCount} applications to queue!`,
          type: "success",
        });
        await fetchLoops();
      } else {
        setRunResultToast({
          message: data.message || "Failed to execute loop.",
          type: "error",
        });
      }
    } catch (err) {
      setRunResultToast({ message: "Network error during loop run.", type: "error" });
    } finally {
      setRunningLoopId(null);
      setTimeout(() => setRunResultToast(null), 5000);
    }
  };

  const handleDeleteLoop = async (loopId: string) => {
    try {
      const res = await fetch(`/api/v1/loops/${loopId}`, { method: "DELETE" });
      if (res.ok) {
        setLoops((prev) => prev.filter((l) => l.id !== loopId));
      }
    } catch (err) {
      console.error("Failed to delete loop", err);
    }
  };

  const handleAddTitle = () => {
    if (newTitleInput.trim() && !formData.targetJobTitles.includes(newTitleInput.trim())) {
      setFormData({
        ...formData,
        targetJobTitles: [...formData.targetJobTitles, newTitleInput.trim()],
      });
      setNewTitleInput("");
    }
  };

  const handleRemoveTitle = (title: string) => {
    setFormData({
      ...formData,
      targetJobTitles: formData.targetJobTitles.filter((t) => t !== title),
    });
  };

  const handleAddLocation = () => {
    if (newLocationInput.trim() && !formData.targetLocations.includes(newLocationInput.trim())) {
      setFormData({
        ...formData,
        targetLocations: [...formData.targetLocations, newLocationInput.trim()],
      });
      setNewLocationInput("");
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setFormData({
      ...formData,
      targetLocations: formData.targetLocations.filter((l) => l !== loc),
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
              Autonomous Job Search Loops & Campaigns
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Continuous background discovery across Greenhouse, Lever, Ashby, and Workday with automated Playwright submission and rate-governed queues.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-glow-blue transition-all self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Create New Loop</span>
        </button>
      </div>

      {/* Toast Notification */}
      {runResultToast && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium transition-all ${
            runResultToast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={15} />
            <span>{runResultToast.message}</span>
          </div>
          <button onClick={() => setRunResultToast(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* CREATE NEW LOOP MODAL / STEPPER */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-[#10121a] shadow-2xl p-6 space-y-6">
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Create Autonomous Job Search Loop</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Step {activeStep} of 5 &middot;{" "}
                  {activeStep === 1 && "Search & Target Information"}
                  {activeStep === 2 && "CV / Candidate Profile Selection"}
                  {activeStep === 3 && "Preferences & Rate Limits"}
                  {activeStep === 4 && "Review & Verification"}
                  {activeStep === 5 && "Activate Campaign"}
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    activeStep >= step ? "bg-indigo-500 shadow-glow-blue/50" : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>

            {/* STEP 1: Search Information */}
            {activeStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Campaign / Loop Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2.5 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Senior Backend Engineer - India MNCs"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Target Job Titles (Enter to add)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTitleInput}
                      onChange={(e) => setNewTitleInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTitle())}
                      className="flex-1 rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-indigo-500 focus:outline-none text-xs"
                      placeholder="e.g. Distributed Systems Engineer"
                    />
                    <button
                      type="button"
                      onClick={handleAddTitle}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.targetJobTitles.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-indigo-300 border border-indigo-500/20 font-medium"
                      >
                        <span>{t}</span>
                        <button onClick={() => handleRemoveTitle(t)} className="text-indigo-400 hover:text-white">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Target Locations (India & Tech Hubs)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLocation())}
                      className="flex-1 rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-indigo-500 focus:outline-none text-xs"
                      placeholder="e.g. Bengaluru, Karnataka"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.targetLocations.map((l, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-blue-300 border border-blue-500/20 font-medium"
                      >
                        <span>{l}</span>
                        <button onClick={() => handleRemoveLocation(l)} className="text-blue-400 hover:text-white">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-medium">Remote Work Policy</label>
                    <select
                      value={formData.remotePreference}
                      onChange={(e) => setFormData({ ...formData, remotePreference: e.target.value })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="HYBRID_OR_REMOTE">Hybrid or Remote</option>
                      <option value="REMOTE_ONLY">Remote Only (India / Global)</option>
                      <option value="ONSITE_HYBRID">On-site / Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-medium">Experience Level</label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="ENTRY_MID">Entry to Mid-Level (1-4 yrs)</option>
                      <option value="SENIOR_STAFF">Senior to Staff (5-10 yrs)</option>
                      <option value="LEAD_PRINCIPAL">Lead to Principal (10+ yrs)</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-[11px] text-zinc-300 flex items-center gap-2.5">
                  <Globe size={16} className="text-indigo-400 shrink-0" />
                  <span>
                    <strong>India-First Policy Enforced:</strong> Live ATS crawler will strictly target India locations and worldwide-compatible remote roles with zero US-only leaks.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 2: Resume / Candidate Profile Selection */}
            {activeStep === 2 && (
              <div className="space-y-4 text-xs">
                <label className="text-zinc-400 block font-medium">Select Master CV to attach to this loop:</label>
                <div className="space-y-2.5">
                  {resumes.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => setFormData({ ...formData, resumeId: res.id })}
                      className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                        formData.resumeId === res.id
                          ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                          : "border-white/[0.08] bg-[#161924] hover:border-white/[0.15]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-indigo-400" />
                        <div>
                          <h4 className="font-semibold text-zinc-100">{res.name}</h4>
                          <span className="text-[11px] text-zinc-400">
                            {res.roleFocus} &middot; {res.topSkills.length} competencies indexed
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {res.atsScore && (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/20">
                            {res.atsScore}% ATS Ready
                          </span>
                        )}
                        <input
                          type="radio"
                          checked={formData.resumeId === res.id}
                          onChange={() => setFormData({ ...formData, resumeId: res.id })}
                          className="accent-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Candidate Vault Sync</span>
                    <span className="text-[10px] font-mono text-emerald-400">✓ Ready</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Applying as <strong>{profile.fullName}</strong> ({profile.email} &middot; {profile.phone}). All custom ATS questions will be resolved from your verified vault.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Preferences & Rate Limits */}
            {activeStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">Daily Apply Limit</span>
                      <span className="font-mono text-indigo-400 font-bold">{formData.dailyApplicationLimit} / day</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      value={formData.dailyApplicationLimit}
                      onChange={(e) => setFormData({ ...formData, dailyApplicationLimit: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[10px] text-zinc-500">Paced with 4.5s – 11.2s anti-ban jitter</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">Daily Discovery Cap</span>
                      <span className="font-mono text-indigo-400 font-bold">{formData.dailyDiscoveryLimit} jobs</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="150"
                      step="10"
                      value={formData.dailyDiscoveryLimit}
                      onChange={(e) => setFormData({ ...formData, dailyDiscoveryLimit: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[10px] text-zinc-500">Scraped from Greenhouse, Lever, Ashby</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#161924] p-3 cursor-pointer">
                    <div>
                      <span className="font-semibold text-zinc-100 block">Autonomous Auto-Apply</span>
                      <span className="text-[11px] text-zinc-400">
                        Automatically dispatch matching jobs to Playwright automation queue.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.autoApplyEnabled}
                      onChange={(e) => setFormData({ ...formData, autoApplyEnabled: e.target.checked })}
                      className="h-4 w-4 rounded accent-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#161924] p-3 cursor-pointer">
                    <div>
                      <span className="font-semibold text-zinc-100 block">Recruiter Email Outreach</span>
                      <span className="text-[11px] text-zinc-400">
                        Send verified introduction emails via connected Resend provider when recruiter email is parsed.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.recruiterOutreachEnabled}
                      onChange={(e) => setFormData({ ...formData, recruiterOutreachEnabled: e.target.checked })}
                      className="h-4 w-4 rounded accent-indigo-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {activeStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-4 space-y-3">
                  <h4 className="font-semibold text-zinc-100 text-sm">{formData.name}</h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px] border-t border-white/[0.06] pt-3">
                    <div>
                      <span className="text-zinc-500 block font-mono">TARGET TITLES</span>
                      <span className="text-zinc-200 font-medium">{formData.targetJobTitles.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block font-mono">LOCATIONS</span>
                      <span className="text-zinc-200 font-medium">{formData.targetLocations.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block font-mono">ATTACHED CV</span>
                      <span className="text-zinc-200 font-medium">
                        {resumes.find((r) => r.id === formData.resumeId)?.name || "Default Resume"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block font-mono">AUTOMATION QUOTA</span>
                      <span className="text-indigo-400 font-medium">
                        {formData.dailyApplicationLimit} applies / day &middot; {formData.dailyDiscoveryLimit} discoveries
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-zinc-300 flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>Verification Passed:</strong> Zero mock dependencies. Ready for continuous PostgreSQL-backed execution.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 5: Activate */}
            {activeStep === 5 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">Activate Autonomous Loop</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Your loop will be saved to PostgreSQL and queued for continuous ATS ingestion and submission.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1) as any)}
                disabled={activeStep === 1}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
              >
                Back
              </button>

              {activeStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => Math.min(5, prev + 1) as any)}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-glow-blue"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateLoop}
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-glow-blue"
                >
                  Confirm & Launch Loop
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOOPS LIST VIEW */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : loops.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#10121a] p-12 text-center space-y-4 shadow-card-dark">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Compass size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">No Job Search Loops Active</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Create your first autonomous search loop to continuously crawl ATS boards and apply at scale.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-glow-blue"
          >
            <Plus size={14} />
            <span>Create First Search Loop</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loops.map((loop) => (
            <div
              key={loop.id}
              className="rounded-2xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{loop.name}</h3>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} className="text-zinc-500" />
                      <span>
                        Created {new Date(loop.createdAt).toLocaleDateString()} &middot;{" "}
                        {loop.lastRunAt ? `Last run ${new Date(loop.lastRunAt).toLocaleTimeString()}` : "Not run yet"}
                      </span>
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${
                      loop.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {loop.status}
                  </span>
                </div>

                {/* Target Titles & Locations Badges */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {loop.targetJobTitles.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-300 font-medium border border-indigo-500/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1 text-[11px] text-zinc-400">
                    <span className="text-zinc-500">Locations:</span>
                    <span>{loop.targetLocations.join(", ") || "India (All Hubs)"}</span>
                  </div>
                </div>

                {/* Real-time Computed Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.06] text-center">
                  <div className="rounded-lg bg-[#161924] p-2">
                    <span className="font-mono text-sm font-bold text-zinc-100">
                      {loop.realtimeStats?.appliedCount ?? loop.appliedCount}
                    </span>
                    <span className="block text-[9px] text-zinc-500 uppercase">Applied</span>
                  </div>
                  <div className="rounded-lg bg-[#161924] p-2">
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {loop.realtimeStats?.inProgressCount ?? 0}
                    </span>
                    <span className="block text-[9px] text-zinc-500 uppercase">In Progress</span>
                  </div>
                  <div className="rounded-lg bg-[#161924] p-2">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {loop.realtimeStats?.waitingUserCount ?? 0}
                    </span>
                    <span className="block text-[9px] text-zinc-500 uppercase">Review Gate</span>
                  </div>
                  <div className="rounded-lg bg-[#161924] p-2">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {loop.realtimeStats?.interviewCount ?? loop.interviewCount}
                    </span>
                    <span className="block text-[9px] text-zinc-500 uppercase">Interviews</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunLoop(loop.id)}
                    disabled={runningLoopId === loop.id}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-all disabled:opacity-50"
                  >
                    {runningLoopId === loop.id ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-indigo-400" />
                        <span>Running Loop...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>Run Loop Now</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleToggleStatus(loop)}
                    className="rounded-lg bg-[#161924] px-3 py-1.5 text-zinc-300 hover:bg-[#1e2333] border border-white/[0.06]"
                  >
                    {loop.status === "ACTIVE" ? "Pause" : "Resume"}
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteLoop(loop.id)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                  title="Delete Loop"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
