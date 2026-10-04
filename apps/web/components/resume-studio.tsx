"use client";

import React, { useRef, useState } from "react";
import { ResumeVersion } from "../lib/mock-data";
import {
  FileText,
  Plus,
  CheckCircle,
  ExternalLink,
  Download,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
  Compass,
  Search,
  RefreshCw,
} from "./icons";

interface ResumeStudioProps {
  resumes: ResumeVersion[];
  onSetDefault: (id: string) => void;
  onParsedResume: (resume: ResumeVersion, profileUpdates?: any) => void;
  onSearchMatchingJobs?: (skills: string[], roleFocus: string) => void;
}

export function ResumeStudio({
  resumes,
  onSetDefault,
  onParsedResume,
  onSearchMatchingJobs,
}: ResumeStudioProps) {
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"analysis" | "diff">("analysis");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  const uploadResume = async (file: File) => {
    setIsUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      const response = await fetch("/api/v1/resumes", { method: "POST", body: form });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          resume?: ResumeVersion;
          profileUpdates?: any;
        };
        message?: string;
      };

      if (!response.ok || !payload.data?.resume) {
        throw new Error(payload.message || "Failed to parse resume.");
      }

      const resume = payload.data.resume;
      onParsedResume(resume, payload.data.profileUpdates);
      setSelectedResumeId(resume.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to parse resume.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
              Resume Intelligence & ATS Profile Synchronizer
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Upload your master resume (PDF, DOCX, TXT) to extract skills, synchronize your candidate profile, and discover live matched openings across Greenhouse, Ashby, and Lever.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadResume(file);
              event.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-glow-blue transition-all disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <RefreshCw size={14} className="animate-spin text-white" />
                <span>Parsing & Indexing...</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Upload Master Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-400">
          {uploadError}
        </p>
      )}

      {/* Main Grid: Left Resume List, Right Parsed Breakdown */}
      {selectedResume && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Versions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Saved Master Resumes ({resumes.length})
              </div>
            </div>

            {resumes.map((res) => {
              const isSelected = res.id === selectedResume?.id;
              return (
                <div
                  key={res.id}
                  onClick={() => setSelectedResumeId(res.id)}
                  className={`group flex flex-col gap-2 rounded-xl border p-4 text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500/40 bg-[#141724] ring-1 ring-blue-500/30 shadow-glow-blue/20"
                      : "border-white/[0.08] bg-[#10121a] hover:border-white/[0.16] shadow-card-dark"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-[#161924] text-zinc-400 border border-white/[0.05]"
                        }`}
                      >
                        <FileText size={16} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-100 leading-tight truncate max-w-[180px]">
                          {res.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500">
                          Updated {res.updatedAt} &middot; {res.fileSize}
                        </span>
                      </div>
                    </div>

                    {res.isDefault && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 font-medium pt-1">
                    Target Role: <span className="text-zinc-200">{res.roleFocus}</span>
                  </p>

                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-2 text-[10px]">
                    <span className="font-mono text-zinc-500">
                      Skills Extracted:{" "}
                      <strong className="text-emerald-400 font-semibold">
                        {res.topSkills.length}
                      </strong>
                    </span>
                    {!res.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(res.id);
                        }}
                        className="text-zinc-400 hover:text-blue-400 transition-colors underline underline-offset-2"
                      >
                        Set Primary
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep Parsed Analysis of Selected Resume */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "analysis"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Extracted Skills & Attributes
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === "diff"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  AI ATS Tailoring Preview
                </button>
              </div>

              {onSearchMatchingJobs && (
                <button
                  onClick={() =>
                    onSearchMatchingJobs(selectedResume.topSkills, selectedResume.roleFocus)
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-all shadow-sm"
                >
                  <Compass size={13} />
                  <span>Find Live Openings for this Resume</span>
                </button>
              )}
            </div>

            {activeTab === "analysis" ? (
              /* Skills & Extracted Profile */
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-100 block">
                      Parsed Technical Competencies ({selectedResume.topSkills.length})
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">
                      ✓ Synchronized with ATS match engine
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.topSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#161924] px-3 py-1.5 text-xs font-medium text-zinc-200"
                      >
                        <CheckCircle size={12} className="text-emerald-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Real-time ATS Verification Diagnostics */}
                <div className="space-y-2.5 pt-3 border-t border-white/[0.08]">
                  <label className="text-xs font-semibold text-zinc-100 block">
                    ATS Schema Verification
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 text-xs">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Text Extraction</span>
                      <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>100% Vectorized</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Structure parsed for automated ATS form filling.</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 text-xs">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Target Role Band</span>
                      <div className="mt-1 font-semibold text-blue-400 flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>{selectedResume.roleFocus.split("/")[0]}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Matches staff & senior job classifications.</p>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 text-xs">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Playwright Auto-Fill</span>
                      <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>Ready for Auto-Apply</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Standard fields auto-populate with zero human delay.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Side-by-Side ATS Diff */
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-100">{selectedResume.name}</span>
                    <p className="text-[11px] text-zinc-400">
                      Dynamically aligned bullet points tailored for target ATS schemas.
                    </p>
                  </div>
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-400 border border-blue-500/20">
                    Live Vector Diff
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Master Experience */}
                  <div className="rounded-lg border border-white/[0.08] bg-[#0c0e15] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-white/[0.05] pb-2">
                      <span className="uppercase tracking-wider">Source Resume Content</span>
                      <span>Parsed input</span>
                    </div>
                    <div className="space-y-3 text-[11px] text-zinc-400 leading-relaxed">
                      <p className="p-2.5 rounded bg-[#10121a] border border-white/[0.05]">
                        • Built multi-tenant backend services and Postgres database tables handling high transactional volume.
                      </p>
                      <p className="p-2.5 rounded bg-[#10121a] border border-white/[0.05]">
                        • Managed message queues and event workers for asynchronous job execution across worker clusters.
                      </p>
                      <p className="p-2.5 rounded bg-[#10121a] border border-white/[0.05]">
                        • Created automated end-to-end integration tests using headless browser testing tools.
                      </p>
                    </div>
                  </div>

                  {/* Tailored Experience */}
                  <div className="rounded-lg border border-blue-500/30 bg-[#0d101a] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-blue-400 border-b border-blue-500/20 pb-2">
                      <span className="uppercase tracking-wider font-semibold">AI ATS Tailored Draft</span>
                      <span>Target ATS Profile</span>
                    </div>
                    <div className="space-y-3 text-[11px] leading-relaxed">
                      <p className="p-2.5 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                        • Architected multi-region <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">PostgreSQL horizontal sharding</strong> handling <strong className="text-emerald-400 font-bold">&gt;45k write ops/sec</strong> with zero-downtime replication failover.
                      </p>
                      <p className="p-2.5 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                        • Designed resilient <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">Kafka & BullMQ event-driven streaming pipelines</strong> with idempotent CDC event consumers and backpressure mitigation.
                      </p>
                      <p className="p-2.5 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                        • Built reliable <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">workflow and integration tooling</strong> with explicit review steps for sensitive operations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
