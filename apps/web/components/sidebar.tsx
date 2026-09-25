"use client";

import React from "react";
import {
  Kanban,
  ShieldCheck,
  Compass,
  Terminal,
  FileText,
  User,
  Play,
  Pause,
  ArrowUpRight,
  Activity,
  Cpu,
  Star,
  Award,
  Building,
} from "./icons";

export type NavTab = "pipeline" | "reviews" | "discovery" | "resumes" | "telemetry" | "profile";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingReviewCount: number;
  activeAutomationsCount: number;
  discoveredJobsCount: number;
  isQueuePaused: boolean;
  onTogglePauseQueue: () => void;
  tierCounts?: { S: number; A: number; B: number; C: number };
  totalApplications?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  pendingReviewCount,
  activeAutomationsCount,
  discoveredJobsCount,
  isQueuePaused,
  onTogglePauseQueue,
  tierCounts = { S: 0, A: 0, B: 0, C: 0 },
  totalApplications = 0,
}: SidebarProps) {
  const navItems = [
    {
      id: "pipeline" as NavTab,
      label: "Pipeline",
      icon: Kanban,
      badge: totalApplications > 0 ? `${totalApplications}` : null,
      badgeColor: "bg-zinc-800 text-zinc-400 border border-white/[0.05]",
    },
    {
      id: "reviews" as NavTab,
      label: "Review required",
      icon: ShieldCheck,
      badge: pendingReviewCount > 0 ? `${pendingReviewCount}` : null,
      badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
    {
      id: "discovery" as NavTab,
      label: "Job search",
      icon: Compass,
      badge: discoveredJobsCount > 0 ? `${discoveredJobsCount} new` : null,
      badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    },
    {
      id: "telemetry" as NavTab,
      label: "Activity log",
      icon: Terminal,
      badge: activeAutomationsCount > 0 ? "Live" : null,
      badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "resumes" as NavTab,
      label: "Resumes",
      icon: FileText,
      badge: null,
      badgeColor: "bg-zinc-800 text-zinc-400 border border-white/[0.05]",
    },
    {
      id: "profile" as NavTab,
      label: "Profile & settings",
      icon: User,
      badge: null,
      badgeColor: null,
    },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-white/[0.08] bg-[#090a0f] p-3 text-sm select-none">
      {/* Top navigation links */}
      <div className="flex flex-col gap-6">
        {/* Navigation list */}
        <div className="flex flex-col gap-1">
          <div className="px-3 pb-1.5 pt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#161924] text-zinc-100 font-semibold border border-white/[0.08] shadow-sm"
                    : "text-zinc-400 hover:bg-[#12141c] hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={isActive ? "text-blue-400" : "text-zinc-500"}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium font-mono ${
                      item.badgeColor || "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Company Tier Breakdown */}
        {totalApplications > 0 && (
          <div className="flex flex-col gap-1.5 px-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Company tiers
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between py-0.5 text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  S-Tier · MNC
                </span>
                <span className="font-mono text-[10px] text-amber-400 font-semibold">{tierCounts.S}</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  A-Tier · MNC
                </span>
                <span className="font-mono text-[10px] text-blue-400 font-semibold">{tierCounts.A}</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                  B-Tier · Semi-MNC
                </span>
                <span className="font-mono text-[10px] text-purple-400 font-semibold">{tierCounts.B}</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-zinc-400">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  C-Tier · Startup
                </span>
                <span className="font-mono text-[10px] text-zinc-400 font-semibold">{tierCounts.C}</span>
              </div>
            </div>
          </div>
        )}

        {/* ATS Integrations status */}
        <div className="flex flex-col gap-1.5 px-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Live job sources
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Greenhouse
              </span>
              <span className="font-mono text-[10px] text-zinc-500">Active</span>
            </div>
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Ashby
              </span>
              <span className="font-mono text-[10px] text-zinc-500">Active</span>
            </div>
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Lever
              </span>
              <span className="font-mono text-[10px] text-zinc-500">Active</span>
            </div>
            <div className="flex items-center justify-between py-0.5 text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                Workday
              </span>
              <span className="font-mono text-[10px] text-amber-500/80">Limited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Queue Governor & User profile */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.08]">
        {/* Anti-Shadowban Rate Governor card */}
        <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-3 text-xs shadow-card-dark">
          <div className="flex items-center justify-between pb-1.5">
            <span className="font-medium text-zinc-200 text-[11px]">Application pace</span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              In your control
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
            Nothing is sent without your final review.
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: totalApplications > 0 ? `${Math.min(100, (totalApplications / 8) * 100)}%` : "0%" }}></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between pt-1">
            <button
              onClick={onTogglePauseQueue}
              className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
            >
              {isQueuePaused ? (
                <>
                  <Play size={12} className="text-emerald-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause size={12} className="text-zinc-500" />
                  <span>Pause</span>
                </>
              )}
            </button>
            <span className="text-[10px] font-mono text-zinc-500">{Math.max(0, 8 - totalApplications)} slots</span>
          </div>
        </div>

        {/* Candidate Profile summary */}
        <button
          onClick={() => onSelectTab("profile")}
          className="flex items-center justify-between rounded-lg p-1.5 hover:bg-[#12141c] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#161924] border border-white/[0.08] text-xs font-semibold text-zinc-200">
              +
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#090a0f] bg-emerald-400"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200 leading-tight">Your profile</span>
              <span className="text-[10px] text-zinc-500 font-mono">Add your details</span>
            </div>
          </div>
          <ArrowUpRight size={13} className="text-zinc-500" />
        </button>
      </div>
    </aside>
  );
}
