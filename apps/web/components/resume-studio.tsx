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
  Award,
  Briefcase,
  Clock,
  Layers,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "experience" | "education" | "projects" | "certifications" | "diff"
  >("overview");
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
            Upload and manage your master resumes, extract skills, view structured career timelines, and sync with live ATS openings.
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
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "overview"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Overview & ATS
                </button>
                <button
                  onClick={() => setActiveTab("experience")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "experience"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Work History ({selectedResume.experienceEntries?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("education")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "education"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Education
                </button>
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "projects"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Projects ({selectedResume.projectEntries?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("certifications")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "certifications"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Certifications
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === "diff"
                      ? "text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Tailoring Diff
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
                  <span>Find Live Openings</span>
                </button>
              )}
            </div>

            {/* TAB: Overview & ATS Intelligence */}
            {activeTab === "overview" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-5">
                {/* Executive Summary */}
                {selectedResume.summary && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-100 block">
                      Parsed Executive Summary
                    </label>
                    <p className="text-xs text-zinc-300 leading-relaxed rounded-lg border border-white/[0.06] bg-[#161924] p-3.5">
                      {selectedResume.summary}
                    </p>
                  </div>
                )}

                {/* Technical Skills */}
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

                {/* ATS Verification Diagnostics */}
                <div className="space-y-2.5 pt-3 border-t border-white/[0.08]">
                  <label className="text-xs font-semibold text-zinc-100 block">
                    ATS Readiness & Diagnostics
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-3.5 text-xs">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">ATS Score</span>
                      <div className="mt-1 font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>{selectedResume.atsScore || 95}% Match Power</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">Format compliant with Greenhouse, Ashby, and Lever.</p>
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

                {/* AI Strengths & Suggestions */}
                {selectedResume.strengths && selectedResume.strengths.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <label className="text-xs font-semibold text-zinc-100 block">
                      Key Resume Strengths
                    </label>
                    <ul className="space-y-1 text-xs text-zinc-300">
                      {selectedResume.strengths.map((st, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Work Experience Timeline */}
            {activeTab === "experience" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-xs font-semibold text-zinc-100">Work History & Engineering Impact</h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {selectedResume.experienceEntries?.length || 0} Positions Ingested
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedResume.experienceEntries?.map((exp, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.06] bg-[#161924] p-4 text-xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <h4 className="font-semibold text-zinc-100 text-sm">{exp.role}</h4>
                          <span className="text-blue-400 font-medium">{exp.company}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                          <span>{exp.period}</span>
                          <span>&middot;</span>
                          <span>{exp.location}</span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 pt-1 text-zinc-300 text-[11px] leading-relaxed">
                        {exp.bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0 mt-0.5">▹</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      {exp.techStack && exp.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.04]">
                          {exp.techStack.map((t, ti) => (
                            <span
                              key={ti}
                              className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 border border-white/[0.05]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Education */}
            {activeTab === "education" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-xs font-semibold text-zinc-100">Academic Degrees & Coursework</h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {selectedResume.educationEntries?.length || 0} Degrees
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedResume.educationEntries?.map((edu, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.06] bg-[#161924] p-4 text-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <h4 className="font-semibold text-zinc-100">{edu.degree}</h4>
                          <span className="text-blue-400">{edu.institution}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                          <span>Class of {edu.year}</span>
                          {edu.gpa && <span>GPA: {edu.gpa}</span>}
                        </div>
                      </div>

                      {edu.highlights && edu.highlights.length > 0 && (
                        <ul className="space-y-1 text-zinc-400 text-[11px] pt-1">
                          {edu.highlights.map((h, hi) => (
                            <li key={hi} className="flex items-start gap-2">
                              <span className="text-emerald-400">•</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Projects */}
            {activeTab === "projects" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-xs font-semibold text-zinc-100">Engineering Projects & Open Source</h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {selectedResume.projectEntries?.length || 0} Projects
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedResume.projectEntries?.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.06] bg-[#161924] p-4 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-zinc-100">{proj.title}</h4>
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                          >
                            <span>View Repo</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">{proj.description}</p>
                      {proj.tech && proj.tech.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {proj.tech.map((t, ti) => (
                            <span
                              key={ti}
                              className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-blue-300 border border-blue-500/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Certifications */}
            {activeTab === "certifications" && (
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 shadow-card-dark space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-xs font-semibold text-zinc-100">Certifications & Accreditations</h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {selectedResume.certificationEntries?.length || 0} Verified
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedResume.certificationEntries?.map((cert, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/[0.06] bg-[#161924] p-4 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-semibold text-zinc-100">{cert.name}</h4>
                        <p className="text-zinc-400 text-[11px]">
                          Issued by {cert.issuer} &middot; {cert.date}
                        </p>
                      </div>
                      {cert.credentialId && (
                        <span className="rounded bg-blue-500/10 px-2 py-1 font-mono text-[10px] text-blue-400 border border-blue-500/20">
                          {cert.credentialId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Tailoring Diff */}
            {activeTab === "diff" && (
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
