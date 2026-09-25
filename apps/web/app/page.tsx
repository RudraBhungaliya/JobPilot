"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  INITIAL_RESUMES,
  INITIAL_DISCOVERED_JOBS,
  INITIAL_CANDIDATE_PROFILE,
  INITIAL_APPLICATIONS,
  Application,
  QuestionAnswer,
  ResumeVersion,
  DiscoveredJob,
  CandidateProfile,
  CompanyTier,
  inferCompanyTier,
  getTierLabel,
  getTierColor,
  sortByTier,
  calculateSelectionChance,
} from "../lib/mock-data";
import { Header } from "../components/header";
import { Sidebar, NavTab } from "../components/sidebar";
import { PipelineBoard } from "../components/pipeline-board";
import { PipelineTable } from "../components/pipeline-table";
import { ApplicationDrawer } from "../components/application-drawer";
import { HumanReviewModal } from "../components/human-review-modal";
import { AgentTelemetryModal } from "../components/agent-telemetry-modal";
import { AddJobModal } from "../components/add-job-modal";
import { ResumeStudio } from "../components/resume-studio";
import { CommandMenu } from "../components/command-menu";
import { JobDiscovery } from "../components/job-discovery";
import { CandidateProfileView } from "../components/candidate-profile";
import { ToastContainer, ToastMessage } from "../components/toast";
import {
  Kanban,
  TableIcon,
  Filter,
  ShieldCheck,
  Cpu,
  Search,
  CheckCircle,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
  Terminal,
  Star,
  Award,
} from "../components/icons";

export default function Home() {
  // Core data state
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [isLoadingApplications, setIsLoadingApplications] = useState<boolean>(false);
  const [resumes, setResumes] = useState<ResumeVersion[]>(INITIAL_RESUMES);
  const [discoveredJobs, setDiscoveredJobs] = useState<DiscoveredJob[]>(INITIAL_DISCOVERED_JOBS);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(INITIAL_CANDIDATE_PROFILE);

  // UI state
  const [currentTab, setCurrentTab] = useState<NavTab>("pipeline");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedAtsFilter, setSelectedAtsFilter] = useState<string>("ALL");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(false);

  // Modal / Drawer state
  const [inspectApp, setInspectApp] = useState<Application | null>(null);
  const [reviewModalApp, setReviewModalApp] = useState<Application | null>(null);
  const [telemetryModalApp, setTelemetryModalApp] = useState<Application | null>(null);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Toast system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch live applications with graceful local fallback
  const fetchApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    try {
      const response = await fetch("/api/v1/applications");
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setApplications(json.data);
          return;
        }
      }
      setApplications(INITIAL_APPLICATIONS);
    } catch {
      setApplications(INITIAL_APPLICATIONS);
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const loadLiveJobs = useCallback(async (keyword: string, location: string) => {
    const params = new URLSearchParams({ keyword: keyword || "", location: location || "" });
    try {
      const response = await fetch(`/api/v1/jobs/discover?${params.toString()}`);
      if (!response.ok) throw new Error("Live sources are unavailable right now.");
      const payload = (await response.json()) as {
        data: Array<{
          externalId: string;
          title: string;
          company: string;
          url: string;
          location?: string;
          description: string;
          source: string;
          tier?: CompanyTier;
          salaryRange?: string;
          tags?: string[];
          matchScore?: number;
          selectionChance?: any;
        }>;
        meta: { fetchedAt: string };
      };

      const sourceName = (source: string): DiscoveredJob["atsProvider"] => {
        if (source === "greenhouse") return "Greenhouse";
        if (source === "ashby") return "Ashby";
        if (source === "lever") return "Lever";
        return "Workday";
      };

      const workMode = (value: string): DiscoveredJob["workMode"] =>
        /remote|global|anywhere/i.test(value) ? "Remote" : /hybrid/i.test(value) ? "Hybrid" : "On-site";

      const mapped = payload.data.map((job) => {
        let domain = "company.com";
        try {
          domain = new URL(job.url).hostname.replace(/^www\./, "");
        } catch {
          domain = `${job.company.toLowerCase().replace(/\s+/g, "")}.com`;
        }
        const tier = job.tier || inferCompanyTier(job.company, domain);
        const tags = job.tags && job.tags.length > 0 ? job.tags : ["Distributed Systems", "TypeScript", "Backend"];
        const chance =
          job.selectionChance ||
          calculateSelectionChance(
            {
              jobTitle: job.title,
              descriptionSnippet: job.description,
              tags: tags,
              location: job.location,
              workMode: workMode(job.location || ""),
              companyTier: tier,
            },
            candidateProfile
          );

        return {
          id: job.externalId,
          jobTitle: job.title,
          companyName: job.company,
          companyDomain: domain,
          logoText: job.company.slice(0, 2).toUpperCase(),
          location: job.location || "San Francisco, CA / Remote",
          workMode: workMode(job.location || ""),
          salaryRange: job.salaryRange,
          atsProvider: sourceName(job.source),
          jobUrl: job.url,
          discoveredAt: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
            new Date(payload.meta.fetchedAt || Date.now())
          ),
          tags: tags,
          descriptionSnippet: job.description.replace(/\s+/g, " ").slice(0, 220),
          companyTier: tier,
          matchScore: chance.overallPercentage,
          selectionChance: chance,
        };
      });

      setDiscoveredJobs(mapped);
    } catch {
      // Fallback to initial discovered jobs
      setDiscoveredJobs(INITIAL_DISCOVERED_JOBS);
    }
  }, [candidateProfile]);

  // Computed counts
  const pendingReviewApps = applications.filter((a) => a.status === "WAITING_FOR_USER");
  const pendingReviewCount = pendingReviewApps.length;
  const activeAutomationsCount = applications.filter((a) => a.status === "RUNNING").length;
  const submittedCount = applications.filter((a) => a.status === "SUBMITTED").length;
  const interviewCount = applications.filter((a) => a.status === "INTERVIEW").length;

  const tierCounts = useMemo(() => ({
    S: applications.filter((a) => a.company?.tier === "S").length,
    A: applications.filter((a) => a.company?.tier === "A").length,
    B: applications.filter((a) => a.company?.tier === "B").length,
    C: applications.filter((a) => a.company?.tier === "C").length,
  }), [applications]);

  // Filtered and sorted applications for pipeline & reviews views
  const filteredApps = useMemo(() => {
    const list = applications.filter((app) => {
      const matchesAts = selectedAtsFilter === "ALL" || app.atsProvider === selectedAtsFilter;
      const matchesTier = selectedTierFilter === "ALL" || app.company?.tier === selectedTierFilter;
      const matchesSearch =
        searchFilter === "" ||
        app.jobTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
        app.company?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        app.location.toLowerCase().includes(searchFilter.toLowerCase());

      if (currentTab === "reviews") {
        return app.status === "WAITING_FOR_USER" && matchesAts && matchesTier && matchesSearch;
      }

      return matchesAts && matchesTier && matchesSearch;
    });

    return sortByTier(list);
  }, [applications, selectedAtsFilter, selectedTierFilter, searchFilter, currentTab]);

  // --- Real Backend Action handlers ---

  const handleMoveStage = async (appId: string, newStage: Application["status"]) => {
    const originalApp = applications.find((a) => a.id === appId);
    if (!originalApp) return;

    // Optimistic UI update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: newStage,
              lastUpdated: "Just now",
            }
          : a
      )
    );

    if (inspectApp?.id === appId) {
      setInspectApp((prev) => (prev ? { ...prev, status: newStage, lastUpdated: "Just now" } : null));
    }

    try {
      const response = await fetch(`/api/v1/applications/${appId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStage }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Cannot transition stage to ${newStage}`);
      }

      const updated = result.data as Application;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updated : a))
      );
      if (inspectApp?.id === appId) {
        setInspectApp(updated);
      }

      showToast({
        type: "info",
        title: `${originalApp.company.name} updated`,
        description: `Stage moved to ${newStage}.`,
      });
    } catch (err: any) {
      // Rollback optimistic update
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? originalApp : a))
      );
      if (inspectApp?.id === appId) {
        setInspectApp(originalApp);
      }

      showToast({
        type: "error",
        title: "Stage Transition Rejected",
        description: err.message || "Invalid transition rule.",
      });
    }
  };

  const handleAdvanceStage = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const stages: Application["status"][] = [
      "SAVED",
      "TAILORING",
      "WAITING_FOR_USER",
      "QUEUED",
      "RUNNING",
      "SUBMITTED",
      "INTERVIEW",
      "OFFER",
    ];
    const currentIndex = stages.indexOf(app.status);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      handleMoveStage(appId, nextStage);
    }
  };

  const handleRejectApplication = async (appId: string, reason: string = "Position Filled / Headcount Paused") => {
    const originalApp = applications.find((a) => a.id === appId);
    if (!originalApp) return;

    // Optimistic UI update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: "REJECTED",
              rejectionReason: reason,
              lastUpdated: "Just now",
            }
          : a
      )
    );
    if (inspectApp?.id === appId) {
      setInspectApp((prev) => (prev ? { ...prev, status: "REJECTED", rejectionReason: reason } : null));
    }

    try {
      const response = await fetch(`/api/v1/applications/${appId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: reason,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to reject application");
      }

      const updated = result.data as Application;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updated : a))
      );
      if (inspectApp?.id === appId) {
        setInspectApp(updated);
      }

      showToast({
        type: "warning",
        title: `${originalApp.company.name} Archived`,
        description: `Reason: ${reason}`,
      });
    } catch (err: any) {
      // Rollback
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? originalApp : a))
      );
      if (inspectApp?.id === appId) {
        setInspectApp(originalApp);
      }
      showToast({
        type: "error",
        title: "Rejection Update Failed",
        description: err.message,
      });
    }
  };

  const handleApproveAndSubmit = async (appId: string, updatedQuestions: QuestionAnswer[]) => {
    const originalApp = applications.find((a) => a.id === appId);
    if (!originalApp) return;

    try {
      // Transition to RUNNING with updated questions
      const runRes = await fetch(`/api/v1/applications/${appId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "RUNNING",
          questions: updatedQuestions,
        }),
      });

      const runResult = await runRes.json();
      if (!runRes.ok || !runResult.success) {
        throw new Error(runResult.message || "Failed to prepare submission.");
      }

      const runningApp = runResult.data as Application;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? runningApp : a))
      );
      if (inspectApp?.id === appId) {
        setInspectApp(runningApp);
      }

      showToast({
        type: "success",
        title: "Application submission initiated",
        description: `${originalApp.company.name} prepared with your approved answers.`,
      });

      // Complete submission after execution
      setTimeout(async () => {
        try {
          const submitRes = await fetch(`/api/v1/applications/${appId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "SUBMITTED",
            }),
          });

          const submitResult = await submitRes.json();
          if (submitRes.ok && submitResult.success) {
            const submittedApp = submitResult.data as Application;
            setApplications((prev) =>
              prev.map((a) => (a.id === appId ? submittedApp : a))
            );
            if (inspectApp?.id === appId) {
              setInspectApp(submittedApp);
            }
            showToast({
              type: "success",
              title: "Application submitted!",
              description: `${submittedApp.company.name} confirmed via ${submittedApp.atsProvider}. Receipt stored.`,
            });
          }
        } catch {
          // If network error during final step
        }
      }, 2000);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Submission Error",
        description: err.message,
      });
    }
  };

  const handleSkipApplication = async (appId: string) => {
    await handleMoveStage(appId, "SAVED");
  };

  const handleAddJob = async (newApp: Partial<Application>) => {
    const companyName = newApp.company?.name || "Target Company";
    const companyDomain = newApp.company?.domain || "company.com";
    const tier = newApp.company?.tier || inferCompanyTier(companyName, companyDomain);

    try {
      const response = await fetch("/api/v1/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: newApp.jobTitle || "Software Engineer",
          companyName,
          companyDomain,
          jobUrl: newApp.jobUrl || "https://example.com/careers",
          location: newApp.location || "San Francisco, CA / Remote",
          workMode: newApp.workMode || "Remote",
          salaryRange: newApp.salaryRange || "$180,000 - $240,000",
          atsProvider: newApp.atsProvider || "Greenhouse",
          status: newApp.status || "SAVED",
          matchScore: newApp.matchScore || 92,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to add job application.");
      }

      const created = result.data as Application;
      setApplications((prev) => [created, ...prev]);

      showToast({
        type: "success",
        title: `${created.company.name} ingested (${getTierLabel(created.company.tier)})`,
        description: `${created.jobTitle} added to your pipeline for review.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to Add Job",
        description: err.message,
      });
    }
  };

  const handleSetDefaultResume = (id: string) => {
    setResumes((prev) =>
      prev.map((r) => ({
        ...r,
        isDefault: r.id === id,
      }))
    );
    const resume = resumes.find((r) => r.id === id);
    showToast({
      type: "success",
      title: "Default resume updated",
      description: `${resume?.name} is now the primary resume.`,
    });
  };

  const handleDispatchApply = async (job: DiscoveredJob) => {
    const tier = job.companyTier || inferCompanyTier(job.companyName, job.companyDomain);
    const newApp: Partial<Application> = {
      jobTitle: job.jobTitle,
      company: {
        id: `c-${job.id}`,
        name: job.companyName,
        domain: job.companyDomain,
        logoText: job.logoText,
        location: job.location,
        stage: "Growth",
        verifiedAts: job.atsProvider,
        tier: tier,
      },
      jobUrl: job.jobUrl,
      location: job.location,
      workMode: job.workMode,
      salaryRange: job.salaryRange,
      status: "QUEUED",
      matchScore: job.matchScore || 90,
      atsProvider: job.atsProvider,
      resumeVersionUsed: resumes.find((r) => r.isDefault)?.name || "Staff-FullStack-2026.pdf",
    };
    await handleAddJob(newApp);
    setDiscoveredJobs((prev) => prev.filter((j) => j.id !== job.id));
    setCurrentTab("pipeline");
  };

  const handleSaveJob = async (job: DiscoveredJob) => {
    const tier = job.companyTier || inferCompanyTier(job.companyName, job.companyDomain);
    const newApp: Partial<Application> = {
      jobTitle: job.jobTitle,
      company: {
        id: `c-${job.id}`,
        name: job.companyName,
        domain: job.companyDomain,
        logoText: job.logoText,
        location: job.location,
        stage: "Growth",
        verifiedAts: job.atsProvider,
        tier: tier,
      },
      jobUrl: job.jobUrl,
      location: job.location,
      workMode: job.workMode,
      salaryRange: job.salaryRange,
      status: "SAVED",
      matchScore: job.matchScore || 88,
      atsProvider: job.atsProvider,
      resumeVersionUsed: resumes.find((r) => r.isDefault)?.name || "Staff-FullStack-2026.pdf",
    };
    await handleAddJob(newApp);
    setDiscoveredJobs((prev) => prev.filter((j) => j.id !== job.id));
    setCurrentTab("pipeline");
  };

  return (
    <div className="jobpilot-light flex min-h-screen w-full flex-col bg-[#090a0f]">
      {/* Top Header */}
      <Header
        onOpenAddJob={() => setIsAddJobOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenTelemetry={() => {
          setTelemetryModalApp(applications.find((a) => a.status === "RUNNING") || applications[0]);
          setIsTelemetryModalOpen(true);
        }}
        onFilterReviewGate={() => setCurrentTab("reviews")}
        pendingReviewCount={pendingReviewCount}
        activeAutomationsCount={activeAutomationsCount}
      />

      {/* Main Body with Sidebar + Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingReviewCount={pendingReviewCount}
          activeAutomationsCount={activeAutomationsCount}
          discoveredJobsCount={discoveredJobs.length}
          isQueuePaused={isQueuePaused}
          onTogglePauseQueue={() => setIsQueuePaused((prev) => !prev)}
          tierCounts={tierCounts}
          totalApplications={applications.length}
        />

        {/* Dynamic Content Views */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-[#090a0f]">

          {/* View: Job Discovery */}
          {currentTab === "discovery" && (
            <JobDiscovery
              jobs={discoveredJobs}
              candidateProfile={candidateProfile}
              onRefresh={loadLiveJobs}
              onDispatchApply={handleDispatchApply}
              onSaveJob={handleSaveJob}
            />
          )}

          {/* View: Resumes Studio */}
          {currentTab === "resumes" && (
            <ResumeStudio
              resumes={resumes}
              onSetDefault={handleSetDefaultResume}
              onParsedResume={(resume) => {
                setResumes((previous) => [...previous.map((item) => ({ ...item, isDefault: resume.isDefault ? false : item.isDefault })), resume]);
                showToast({ type: "success", title: "Resume parsed", description: `${resume.topSkills.length} skills were extracted from ${resume.name}.` });
              }}
            />
          )}

          {/* View: Candidate Profile Vault */}
          {currentTab === "profile" && (
            <CandidateProfileView
              profile={candidateProfile}
              onSaveProfile={(updated) => {
                setCandidateProfile(updated);
                showToast({ type: "success", title: "Vault configuration saved", description: "All automation settings have been updated." });
              }}
            />
          )}

          {/* View: Telemetry Console Page */}
          {currentTab === "telemetry" && (
            <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-4 max-w-6xl w-full mx-auto">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Terminal size={16} />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                      Application activity
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    A transparent activity log for saved roles, resume preparation, and submissions you approve.
                  </p>
                </div>
                <button
                  onClick={() => setIsQueuePaused((p) => !p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isQueuePaused
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.08] bg-[#10121a] text-zinc-300 hover:text-white"
                  }`}
                >
                  {isQueuePaused ? "Queue Paused — Click to Resume" : "Queue Active — Click to Pause"}
                </button>
              </div>

              {/* Live console frame */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#090a0f] p-4 text-xs font-mono text-zinc-300 shadow-card-dark flex-1 min-h-[400px]">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3 text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-zinc-200 font-semibold">Worker Node #01: Headless Chromium v124</span>
                  </div>
                  <span className="font-mono text-[10px]">Consent-first application workflow</span>
                </div>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {applications.flatMap((a) =>
                    a.telemetryLogs.map((l, i) => (
                      <div key={`${a.id}-${i}`} className="flex items-start gap-3 text-[11px]">
                        <span className="text-zinc-500 shrink-0">[{l.timestamp}]</span>
                        <span className={`font-semibold shrink-0 ${
                          l.level === "SUCCESS" ? "text-emerald-400" :
                          l.level === "WARN" ? "text-amber-400" :
                          l.level === "ERROR" ? "text-rose-400" : "text-blue-400"
                        }`}>[{l.level}]</span>
                        <span className="text-blue-400 font-semibold shrink-0">{a.company.name}</span>
                        <span className="text-amber-400 shrink-0">[{l.step}]</span>
                        <span className="text-zinc-200">{l.detail}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View: Pipeline & Reviews */}
          {(currentTab === "pipeline" || currentTab === "reviews") && (
            <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-4">
              {/* Context Action Bar */}
              <div className="flex flex-col gap-4">
                {/* Title & View Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
                      {currentTab === "reviews"
                        ? "Human Review & Candidate Sign-off Gate"
                        : "Active Applications Pipeline"}
                    </h1>
                    <p className="text-xs text-zinc-400">
                      {currentTab === "reviews"
                        ? "Review custom essays, confirm compensation preferences, and authorize final submission."
                        : "Greenhouse-style ATS tracking with Tier-based priority (MNCs first)."}
                    </p>
                  </div>

                  {/* View mode switcher & stats pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {currentTab === "pipeline" && (
                      <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#10121a] p-0.5">
                        <button
                          onClick={() => setViewMode("kanban")}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            viewMode === "kanban"
                              ? "bg-[#1c202e] text-zinc-100 font-semibold"
                              : "text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <Kanban size={13} />
                          <span>Board</span>
                        </button>
                        <button
                          onClick={() => setViewMode("table")}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            viewMode === "table"
                              ? "bg-[#1c202e] text-zinc-100 font-semibold"
                              : "text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <TableIcon size={13} />
                          <span>Table</span>
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setIsAddJobOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 shadow-glow-blue transition-all"
                    >
                      <Plus size={13} />
                      <span>Ingest Job</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-3 shadow-card-dark">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Tracked Positions
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        {applications.length}
                      </span>
                      <span className="text-[10px] text-amber-400">
                        {tierCounts.S + tierCounts.A} MNCs Priority
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 shadow-card-dark">
                    <span className="text-[10px] font-mono text-amber-500 uppercase">
                      Needs Human Sign-off
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-amber-400">
                        {pendingReviewCount}
                      </span>
                      <span className="text-[10px] text-amber-400/70">Awaiting approval</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-3 shadow-card-dark">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Verified Submissions
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {submittedCount}
                      </span>
                      <span className="text-[10px] text-zinc-400">Receipts stored</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-3 shadow-card-dark">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Active Interviews
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-purple-400">
                        {interviewCount}
                      </span>
                      <span className="text-[10px] text-zinc-400">In Progress</span>
                    </div>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#10121a] p-2.5 shadow-card-dark">
                  {/* Tier & ATS Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {/* Tier Priority Filters */}
                    <span className="text-zinc-500 font-mono text-[10px] uppercase pl-1 pr-1">
                      Tier:
                    </span>
                    {[
                      { key: "ALL", label: "All Tiers", dot: "" },
                      { key: "S", label: "S · MNC", dot: "bg-amber-400" },
                      { key: "A", label: "A · MNC", dot: "bg-blue-400" },
                      { key: "B", label: "B · Semi-MNC", dot: "bg-purple-400" },
                      { key: "C", label: "C · Startup", dot: "bg-zinc-400" },
                    ].map((tier) => (
                      <button
                        key={tier.key}
                        onClick={() => setSelectedTierFilter(tier.key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                          selectedTierFilter === tier.key
                            ? "bg-blue-600 text-white shadow-glow-blue"
                            : "bg-[#161924] text-zinc-400 hover:bg-[#1c202e] hover:text-zinc-200"
                        }`}
                      >
                        {tier.dot && <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />}
                        <span>{tier.label}</span>
                      </button>
                    ))}

                    <span className="text-zinc-600 font-mono text-[10px] px-1">|</span>

                    {/* ATS Filter Chips */}
                    <span className="text-zinc-500 font-mono text-[10px] uppercase pl-1 pr-1">
                      ATS:
                    </span>
                    {["ALL", "Greenhouse", "Ashby", "Lever", "Workday"].map((ats) => (
                      <button
                        key={ats}
                        onClick={() => setSelectedAtsFilter(ats)}
                        className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                          selectedAtsFilter === ats
                            ? "bg-blue-600 text-white shadow-glow-blue"
                            : "bg-[#161924] text-zinc-400 hover:bg-[#1c202e] hover:text-zinc-200"
                        }`}
                      >
                        {ats}
                      </button>
                    ))}
                  </div>

                  {/* Search input */}
                  <div className="relative sm:w-64">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-2.5 text-zinc-500"
                    />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter by role, company..."
                      className="w-full rounded-lg border border-white/[0.08] bg-[#090a0f] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:bg-[#0d101a] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reviews Banner */}
              {currentTab === "reviews" && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-amber-400 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <div>
                      <span className="font-semibold block text-sm text-amber-300">
                        Human-in-the-Loop Approval Queue
                      </span>
                      <p className="text-[11px] text-amber-400/70">
                        Click any pending opportunity below to review agent-drafted answers before automated submission to Greenhouse or Ashby.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Board or Table rendering */}
              <div className="flex-1">
                {viewMode === "kanban" && currentTab !== "reviews" ? (
                  <PipelineBoard
                    applications={filteredApps}
                    onSelectApplication={(app) => setInspectApp(app)}
                    onOpenReviewModal={(app) => setReviewModalApp(app)}
                    onOpenTelemetryModal={(app) => {
                      setTelemetryModalApp(app);
                      setIsTelemetryModalOpen(true);
                    }}
                    onMoveStage={handleMoveStage}
                    onRejectApplication={(id) => handleRejectApplication(id)}
                  />
                ) : (
                  <PipelineTable
                    applications={filteredApps}
                    onSelectApplication={(app) => setInspectApp(app)}
                    onOpenReviewModal={(app) => setReviewModalApp(app)}
                    onOpenTelemetryModal={(app) => {
                      setTelemetryModalApp(app);
                      setIsTelemetryModalOpen(true);
                    }}
                    onMoveStage={handleMoveStage}
                    onRejectApplication={(id, reason) => handleRejectApplication(id, reason)}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Slide-over Inspection Drawer */}
      <ApplicationDrawer
        application={inspectApp}
        onClose={() => setInspectApp(null)}
        onOpenReviewModal={(app) => {
          setInspectApp(null);
          setReviewModalApp(app);
        }}
        onOpenTelemetryModal={(app) => {
          setTelemetryModalApp(app);
          setIsTelemetryModalOpen(true);
        }}
        onAdvanceStage={handleAdvanceStage}
        onRejectApplication={(id, reason) => handleRejectApplication(id, reason)}
      />

      {/* Human Review Modal */}
      <HumanReviewModal
        application={reviewModalApp}
        onClose={() => setReviewModalApp(null)}
        onApproveAndSubmit={handleApproveAndSubmit}
        onSkipApplication={handleSkipApplication}
      />

      {/* Live Telemetry Modal */}
      <AgentTelemetryModal
        application={telemetryModalApp}
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
        isQueuePaused={isQueuePaused}
        onTogglePauseQueue={() => setIsQueuePaused((p) => !p)}
      />

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        resumes={resumes}
        onAddJob={handleAddJob}
      />

      {/* Command Menu (⌘K) */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        applications={applications}
        onSelectApplication={(app) => setInspectApp(app)}
        onOpenAddJob={() => setIsAddJobOpen(true)}
        onOpenTelemetry={() => {
          setTelemetryModalApp(applications[0]);
          setIsTelemetryModalOpen(true);
        }}
        onSelectTab={setCurrentTab}
        onToggleViewMode={() =>
          setViewMode((prev) => (prev === "kanban" ? "table" : "kanban"))
        }
        viewMode={viewMode}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
