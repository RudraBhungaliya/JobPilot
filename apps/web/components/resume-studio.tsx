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
} from "./icons";

interface ResumeStudioProps {
  resumes: ResumeVersion[];
  onSetDefault: (id: string) => void;
  onParsedResume: (resume: ResumeVersion) => void;
}

export function ResumeStudio({ resumes, onSetDefault, onParsedResume }: ResumeStudioProps) {
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"analysis" | "diff">("diff");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  const uploadResume = async (file: File) => {
    setIsUploading(true); setUploadError("");
    try {
      const form = new FormData(); form.append("resume", file);
      const response = await fetch("/api/v1/resumes/preview", { method: "POST", body: form });
      const payload = await response.json() as { data?: { parsed?: { skills?: string[] } }; message?: string };
      if (!response.ok || !payload.data?.parsed) throw new Error(payload.message || "We could not parse that resume.");
      const resume: ResumeVersion = { id: `resume-${Date.now()}`, name: file.name, roleFocus: "Uploaded resume", updatedAt: "Just now", fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`, isDefault: resumes.length === 0, topSkills: payload.data.parsed.skills || [], matchRateAverage: 0 };
      onParsedResume(resume); setSelectedResumeId(resume.id);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "We could not parse that resume."); }
    finally { setIsUploading(false); }
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
              Resume review
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Upload a PDF or DOCX, check what was extracted, and tailor a copy for a role without changing your original.
          </p>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); event.target.value = ""; }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 shadow-glow-blue transition-all self-start disabled:opacity-60">
          <Plus size={14} />
          <span>{isUploading ? "Parsing resume…" : "Upload resume"}</span>
        </button>
      </div>

      {uploadError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{uploadError}</p>}

      {!selectedResume && <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center"><FileText size={24} className="mx-auto mb-2 text-zinc-400" /><p className="text-sm text-zinc-700">Upload your resume to start.</p><p className="mt-1 text-xs text-zinc-500">PDF, DOCX or TXT up to 10 MB. Files are parsed for this preview and then removed from the server.</p></div>}

      {/* Main Grid: Left Resume List, Right Parsed Breakdown */}
      {selectedResume && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Versions List */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Parsed resumes ({resumes.length})
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
                  Focus: {res.roleFocus}
                </p>

                <div className="flex items-center justify-between border-t border-white/[0.05] pt-2 text-[10px]">
                  <span className="font-mono text-zinc-500">
                    Avg. ATS Match:{" "}
                    <strong className="text-emerald-400 font-semibold">
                      {res.matchRateAverage}%
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
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Deep Parsed Analysis of Selected Resume */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("diff")}
                className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  activeTab === "diff"
                    ? "text-blue-400 bg-blue-500/10 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Role-specific version
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  activeTab === "analysis"
                    ? "text-blue-400 bg-blue-500/10 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Extracted details
              </button>
            </div>

            <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#161924] px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#1f2434] transition-colors">
              <Download size={13} />
              <span>Export Tailored PDF</span>
            </button>
          </div>

          {activeTab === "diff" ? (
            /* Side-by-Side ATS Diff */
            <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-xs">
                <div>
                  <span className="font-semibold text-zinc-100">{selectedResume.name}</span>
                  <p className="text-[11px] text-zinc-400">
                    Compare your original resume with a role-specific draft before you use it.
                  </p>
                </div>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-400 border border-blue-500/20">
                  Formatting checked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Master Experience */}
                <div className="rounded-lg border border-white/[0.08] bg-[#0c0e15] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-white/[0.05] pb-2">
                    <span className="uppercase tracking-wider">Original resume</span>
                    <span>Your source file</span>
                  </div>
                  <div className="space-y-3 text-[11px] text-zinc-400 leading-relaxed">
                    <p className="p-2 rounded bg-[#10121a] border border-white/[0.05]">
                      • Built multi-tenant backend services and Postgres database tables handling high transactional volume.
                    </p>
                    <p className="p-2 rounded bg-[#10121a] border border-white/[0.05]">
                      • Managed message queues and event workers for asynchronous job execution across worker clusters.
                    </p>
                    <p className="p-2 rounded bg-[#10121a] border border-white/[0.05]">
                      • Created automated end-to-end integration tests using headless browser testing tools.
                    </p>
                  </div>
                </div>

                {/* Tailored Experience */}
                <div className="rounded-lg border border-blue-500/30 bg-[#0d101a] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-400 border-b border-blue-500/20 pb-2">
                    <span className="uppercase tracking-wider font-semibold">Role-specific draft</span>
                    <span>Review before exporting</span>
                  </div>
                  <div className="space-y-3 text-[11px] leading-relaxed">
                    <p className="p-2 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                      • Architected multi-region <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">PostgreSQL horizontal sharding</strong> handling <strong className="text-emerald-400 font-bold">&gt;45k write ops/sec</strong> with zero-downtime replication failover.
                    </p>
                    <p className="p-2 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                      • Designed resilient <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">Kafka & BullMQ event-driven streaming pipelines</strong> with idempotent CDC event consumers and backpressure mitigation.
                    </p>
                    <p className="p-2 rounded bg-blue-500/10 border border-blue-500/25 text-zinc-200">
                      • Built reliable <strong className="text-emerald-400 font-bold underline decoration-emerald-500/50">workflow and integration tooling</strong> with explicit review steps for sensitive operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Keyword Analysis */
            <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-100 block">
                  Skills found in your resume
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.topSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#161924] px-3 py-1 text-xs font-medium text-zinc-200"
                    >
                      <CheckCircle size={12} className="text-emerald-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* ATS Compatibility Diagnostics */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-semibold text-zinc-100 block">
                  Parsing checks
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3 text-xs">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Text extraction</span>
                    <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={13} />
                      <span>Headings found</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Experience, education and skills are separated.</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3 text-xs">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Contact details</span>
                    <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={13} />
                      <span>Ready to review</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Confirm phone, email and links before applying.</p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3 text-xs">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Formatting</span>
                    <div className="mt-1 font-semibold text-amber-400 flex items-center gap-1">
                      <ShieldCheck size={13} />
                      <span>Manual check</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Use a simple one-column layout for the most reliable parsing.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
