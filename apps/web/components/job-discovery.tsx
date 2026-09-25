"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DiscoveredJob,
  CompanyTier,
  getTierColor,
  getTierLabel,
  TIER_PRIORITY,
  inferCompanyTier,
  calculateSelectionChance,
  CandidateProfile,
  INITIAL_CANDIDATE_PROFILE,
} from "../lib/mock-data";
import {
  Compass,
  Search,
  ExternalLink,
  MapPin,
  RefreshCw,
  Plus,
  Star,
  Award,
  Building,
  Zap,
  CheckCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Clock,
} from "./icons";

interface JobDiscoveryProps {
  jobs: DiscoveredJob[];
  candidateProfile?: CandidateProfile;
  onRefresh: (keyword: string, location: string) => Promise<void>;
  onDispatchApply: (job: DiscoveredJob) => void;
  onSaveJob: (job: DiscoveredJob) => void;
}

export function JobDiscovery({
  jobs,
  candidateProfile = INITIAL_CANDIDATE_PROFILE,
  onRefresh,
  onDispatchApply,
  onSaveJob,
}: JobDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("ALL");
  const [tierFilter, setTierFilter] = useState<"ALL" | CompanyTier>("ALL");
  const [chanceFilter, setChanceFilter] = useState<"ALL" | "VERY_HIGH" | "HIGH" | "MODERATE">("ALL");
  const [sortBy, setSortBy] = useState<"CHANCE" | "TIER" | "NEWEST">("CHANCE");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  const refresh = async (q = query, loc = location) => {
    setIsRefreshing(true);
    setError("");
    try {
      await onRefresh(q, loc);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the live job sources.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Compute selection chance deterministically for each job
  const enrichedJobs = useMemo(() => {
    return jobs.map((job) => {
      const tier = job.companyTier || inferCompanyTier(job.companyName, job.companyDomain);
      const chance = job.selectionChance || calculateSelectionChance({ ...job, companyTier: tier }, candidateProfile);
      return {
        ...job,
        companyTier: tier,
        selectionChance: chance,
        matchScore: chance.overallPercentage,
      };
    });
  }, [jobs, candidateProfile]);

  // Filter & sort jobs
  const processedJobs = useMemo(() => {
    const filtered = enrichedJobs.filter((job) => {
      const q = query.toLowerCase().trim();
      const loc = location.toLowerCase().trim();

      const queryMatch =
        !q ||
        job.jobTitle.toLowerCase().includes(q) ||
        job.companyName.toLowerCase().includes(q) ||
        job.tags.some((t) => t.toLowerCase().includes(q)) ||
        job.descriptionSnippet.toLowerCase().includes(q);

      const locMatch =
        !loc ||
        loc === "all" ||
        job.location.toLowerCase().includes(loc) ||
        (loc === "remote" && job.workMode === "Remote");

      const modeMatch = workMode === "ALL" || job.workMode === workMode;
      const tierMatch = tierFilter === "ALL" || job.companyTier === tierFilter;

      let chanceMatch = true;
      if (chanceFilter === "VERY_HIGH") chanceMatch = (job.selectionChance?.overallPercentage ?? 0) >= 90;
      else if (chanceFilter === "HIGH") chanceMatch = (job.selectionChance?.overallPercentage ?? 0) >= 80;
      else if (chanceFilter === "MODERATE") chanceMatch = (job.selectionChance?.overallPercentage ?? 0) >= 65;

      return queryMatch && locMatch && modeMatch && tierMatch && chanceMatch;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "CHANCE") {
        return (b.selectionChance?.overallPercentage ?? 0) - (a.selectionChance?.overallPercentage ?? 0);
      }
      if (sortBy === "TIER") {
        return TIER_PRIORITY[a.companyTier!] - TIER_PRIORITY[b.companyTier!];
      }
      // NEWEST
      return 0;
    });
  }, [enrichedJobs, query, location, workMode, tierFilter, chanceFilter, sortBy]);

  const tierCounts = useMemo(() => {
    const counts: Record<CompanyTier, number> = { S: 0, A: 0, B: 0, C: 0 };
    enrichedJobs.forEach((job) => {
      const tier = job.companyTier || "C";
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }, [enrichedJobs]);

  const handleToggleSave = (job: DiscoveredJob) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) {
        next.delete(job.id);
      } else {
        next.add(job.id);
      }
      return next;
    });
    onSaveJob(job);
  };

  const getChanceBadge = (percentage: number) => {
    if (percentage >= 90) {
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-300",
        border: "border-emerald-500/30",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
        label: "Very High Chance",
        dot: "bg-emerald-400",
      };
    }
    if (percentage >= 80) {
      return {
        bg: "bg-blue-500/15",
        text: "text-blue-300",
        border: "border-blue-500/30",
        glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",
        label: "High Chance",
        dot: "bg-blue-400",
      };
    }
    if (percentage >= 68) {
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-300",
        border: "border-amber-500/30",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
        label: "Moderate Chance",
        dot: "bg-amber-400",
      };
    }
    return {
      bg: "bg-zinc-500/15",
      text: "text-zinc-300",
      border: "border-zinc-500/30",
      glow: "shadow-none",
      label: "Competitive Stretch",
      dot: "bg-zinc-400",
    };
  };

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
              Live Verified Openings & Selection Probability Engine
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Verified directly from Greenhouse, Ashby, and Lever career portals. Selection chances are calculated deterministically against your candidate profile skills and experience.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#161924] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-white/[0.16] transition-colors disabled:opacity-60 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
          <span>{isRefreshing ? "Fetching verified ATS..." : "Refresh Openings"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void refresh();
        }}
        className="grid grid-cols-1 md:grid-cols-[1.5fr_1.2fr_auto] gap-2.5 rounded-xl border border-white/[0.08] bg-[#10121a] p-3 shadow-card-dark"
      >
        <label className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, skills, keywords (e.g. Distributed Systems, Staff, Kubernetes, Go)"
            className="w-full rounded-lg border border-white/[0.08] bg-[#090a0f] py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="relative">
          <MapPin size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location filter (e.g. Bengaluru, Remote, San Francisco)"
            className="w-full rounded-lg border border-white/[0.08] bg-[#090a0f] py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isRefreshing}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-glow-blue disabled:opacity-60"
          >
            Search ATS
          </button>
          {(query || location) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLocation("");
                void refresh("", "");
              }}
              className="rounded-lg border border-white/[0.08] bg-[#161924] px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Multi-tier & Selection Probability Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-[#10121a] p-3.5 rounded-xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tier Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500 uppercase pl-1 font-semibold">Tier:</span>
            {[
              { key: "ALL", label: "All Tiers", dot: "" },
              { key: "S", label: "S · Big Tech MNC", dot: "bg-amber-400" },
              { key: "A", label: "A · Major MNC", dot: "bg-blue-400" },
              { key: "B", label: "B · Scaleup", dot: "bg-purple-400" },
              { key: "C", label: "C · Startup", dot: "bg-zinc-400" },
            ].map((tier) => {
              const isActive = tierFilter === tier.key;
              return (
                <button
                  key={tier.key}
                  onClick={() => setTierFilter(tier.key as "ALL" | CompanyTier)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-glow-blue font-semibold"
                      : "bg-[#161924] text-zinc-400 hover:bg-[#1c202e] hover:text-zinc-200 border border-white/[0.05]"
                  }`}
                >
                  {tier.dot && <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />}
                  <span>{tier.label}</span>
                  {tier.key !== "ALL" && (
                    <span className="opacity-70 text-[10px]">({tierCounts[tier.key as CompanyTier] || 0})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "CHANCE" | "TIER" | "NEWEST")}
              className="rounded-lg border border-white/[0.08] bg-[#090a0f] px-2.5 py-1 text-xs font-mono text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="CHANCE">Highest Selection Chance</option>
              <option value="TIER">Tier Priority (S → A → B → C)</option>
              <option value="NEWEST">Most Recently Discovered</option>
            </select>
          </div>
        </div>

        {/* Second Row: Selection Probability Filter & Work Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500 uppercase pl-1 font-semibold">Chance Fit:</span>
            {[
              { key: "ALL", label: "All Odds" },
              { key: "VERY_HIGH", label: "★ 90%+ Very High" },
              { key: "HIGH", label: "80%+ High" },
              { key: "MODERATE", label: "65%+ Moderate" },
            ].map((cf) => {
              const isActive = chanceFilter === cf.key;
              return (
                <button
                  key={cf.key}
                  onClick={() => setChanceFilter(cf.key as any)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                      : "bg-[#161924] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                  }`}
                >
                  {cf.label}
                </button>
              );
            })}

            <span className="text-zinc-700 font-mono text-[10px] px-1 hidden sm:inline">|</span>

            {/* Work mode filter */}
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Mode:</span>
            {["ALL", "Remote", "Hybrid", "On-site"].map((mode) => (
              <button
                key={mode}
                onClick={() => setWorkMode(mode)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                  workMode === mode
                    ? "bg-[#1c202e] text-zinc-100 font-semibold border border-white/[0.12]"
                    : "bg-[#161924] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                }`}
              >
                {mode === "ALL" ? "All Modes" : mode}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-zinc-400 font-semibold">
            {processedJobs.length} verified opening{processedJobs.length === 1 ? "" : "s"} visible
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => void refresh()}
            className="rounded bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isRefreshing && !hasLoaded && (
        <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-12 text-center text-xs text-zinc-400 space-y-2">
          <RefreshCw size={24} className="mx-auto animate-spin text-blue-400" />
          <p className="font-medium text-zinc-300">Scanning Greenhouse, Ashby, and Lever career endpoints...</p>
          <p className="text-[11px] text-zinc-500">Calculating real-time candidate fit and interview shortlist odds.</p>
        </div>
      )}

      {/* Empty State */}
      {!error && hasLoaded && processedJobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#10121a] p-12 text-center space-y-3">
          <Compass size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">No openings found matching your criteria</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Try clearing query keywords or broadening tier/location filters to see all available openings.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setLocation("");
              setWorkMode("ALL");
              setTierFilter("ALL");
              setChanceFilter("ALL");
              void refresh("", "");
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Openings Cards List with Selection Probability Engine */}
      <div className="space-y-3.5">
        {processedJobs.map((job) => {
          const tier = job.companyTier || "C";
          const tierColors = getTierColor(tier);
          const chance = job.selectionChance || calculateSelectionChance(job, candidateProfile);
          const chanceBadge = getChanceBadge(chance.overallPercentage);
          const isExpanded = expandedJobId === job.id;
          const isSaved = savedJobIds.has(job.id);

          return (
            <article
              key={job.id}
              className="group rounded-xl border border-white/[0.08] bg-[#10121a] p-4 sm:p-5 shadow-card-dark hover:border-white/[0.18] hover:bg-[#131622] transition-all"
            >
              <div className="flex flex-col gap-4">
                {/* Header Row: Company, Tier, Title, Selection Chance Badge */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3.5">
                  <div className="flex gap-3.5 items-start">
                    {/* Company Logo Icon */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold text-zinc-100 ${tierColors.bg} ${tierColors.border} ${tierColors.glow}`}
                    >
                      {job.logoText}
                    </div>

                    <div>
                      {/* Job Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                          {job.jobTitle}
                        </h2>
                        <span className="text-xs text-zinc-400">&bull; {job.companyName}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border ${tierColors.bg} ${tierColors.text} ${tierColors.border}`}
                        >
                          {tier}-Tier &middot; {tier === "S" ? "Big Tech MNC" : tier === "A" ? "Major MNC" : tier === "B" ? "Scaleup" : "Startup"}
                        </span>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                          {job.atsProvider} Verified
                        </span>
                      </div>

                      {/* Location, Mode, Compensation, Discovered At */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-zinc-500" />
                          {job.location}
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-zinc-300 font-medium">{job.workMode}</span>
                        {job.salaryRange && (
                          <>
                            <span className="text-zinc-600">&bull;</span>
                            <span className="font-semibold text-emerald-400">{job.salaryRange}</span>
                          </>
                        )}
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {job.discoveredAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selection Chance Gauge & Shortlist Odds */}
                  <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0 bg-[#090a0f] p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold">Selection Odds:</span>
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border ${chanceBadge.bg} ${chanceBadge.text} ${chanceBadge.border} ${chanceBadge.glow}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${chanceBadge.dot} animate-pulse`} />
                        <span>{chance.overallPercentage}% Selected Chance</span>
                      </div>
                    </div>

                    {/* Shortlist odds indicator */}
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span>{chance.shortlistProbability}</span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full rounded-full ${
                          chance.overallPercentage >= 90
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : chance.overallPercentage >= 80
                            ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                            : "bg-gradient-to-r from-amber-500 to-yellow-400"
                        }`}
                        style={{ width: `${chance.overallPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Middle Row: Description Snippet & Skills Pills */}
                <div>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-4xl">
                    {job.descriptionSnippet}
                  </p>

                  {/* Skills Alignment Tags */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Matched Skills:</span>
                    {chance.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-300"
                      >
                        <CheckCircle size={10} className="text-emerald-400" />
                        <span>{skill}</span>
                      </span>
                    ))}

                    {chance.missingOrBonusSkills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-md bg-[#161924] border border-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                      >
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded Deep Dive Fit Details (Toggleable) */}
                {isExpanded && (
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#0c0e15] p-3.5 space-y-2.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2 font-semibold text-zinc-200">
                      <ShieldCheck size={14} className="text-blue-400" />
                      <span>Deterministic Match Analysis & Shortlisting Recommendation</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-[#10121a] p-2.5 rounded-lg border border-white/[0.05]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">Skill Synergy</span>
                        <span className="font-mono text-sm font-bold text-emerald-400">{chance.skillFitScore}% Fit</span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">High semantic overlap with candidate core stack</p>
                      </div>
                      <div className="bg-[#10121a] p-2.5 rounded-lg border border-white/[0.05]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">Experience & Seniority</span>
                        <span className="font-mono text-sm font-bold text-blue-400">{chance.experienceFitScore}% Fit</span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{candidateProfile.yearsOfExperience} yrs satisfies role requirements</p>
                      </div>
                      <div className="bg-[#10121a] p-2.5 rounded-lg border border-white/[0.05]">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">Work Mode & Location</span>
                        <span className="font-mono text-sm font-bold text-purple-400">{chance.locationFitScore}% Fit</span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{job.workMode} / {job.location}</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-300 text-[11px] leading-relaxed">
                      <span className="font-semibold text-blue-200">AI Rationale: </span>
                      {chance.rationale}
                    </div>

                    {chance.actionableTip && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-300 text-[11px] leading-relaxed">
                        <span className="font-semibold text-amber-200">Tailoring Advice: </span>
                        {chance.actionableTip}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
                  <button
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    <span>{isExpanded ? "Hide Match Analysis" : "View Fit Breakdown & Tailoring Advice"}</span>
                    <ChevronRight
                      size={12}
                      className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#161924] px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-white/[0.16] transition-colors"
                      title="Open Verified ATS Portal"
                    >
                      <span>Open {job.atsProvider}</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      onClick={() => handleToggleSave(job)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSaved
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "border-white/[0.08] bg-[#161924] text-zinc-300 hover:text-white hover:border-white/[0.16]"
                      }`}
                    >
                      {isSaved ? "Saved ★" : "Save"}
                    </button>

                    <button
                      onClick={() => onDispatchApply(job)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-glow-blue transition-all active:scale-[0.98]"
                    >
                      <Plus size={13} />
                      <span>Track in Pipeline</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
