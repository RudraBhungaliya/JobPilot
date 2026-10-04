"use client";

import React from "react";
import {
  Search,
  Command,
  Plus,
  Cpu,
  ShieldCheck,
  ChevronDown,
  Zap,
} from "./icons";

interface HeaderProps {
  onOpenAddJob: () => void;
  onOpenCommand: () => void;
  onOpenTelemetry: () => void;
  onFilterReviewGate: () => void;
  pendingReviewCount: number;
  activeAutomationsCount: number;
}

export function Header({
  onOpenAddJob,
  onOpenCommand,
  onOpenTelemetry,
  onFilterReviewGate,
  pendingReviewCount,
  activeAutomationsCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-white/[0.08] bg-[#090a0f]/85 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left section: Brand & Context breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-mono text-xs font-bold shadow-glow-blue">
            JP
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zinc-100 tracking-tight">JobPilot</span>
              <span className="rounded bg-blue-500/10 px-1.5 py-0.2 text-[10px] font-mono font-medium tracking-wide uppercase text-blue-400 border border-blue-500/20">
                Bengaluru
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-normal hidden sm:inline">
              Your job search workspace
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/[0.08]">
          <span className="text-xs text-zinc-500">Location:</span>
          <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-zinc-300 bg-[#161924] border border-white/[0.05]">
            <span>Bengaluru · Local first</span>
            <ChevronDown size={11} className="text-zinc-500" />
          </div>
        </div>
      </div>

      {/* Middle & Right section: Search trigger, Status pills & Primary actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#10121a] px-3 py-1.5 text-xs text-zinc-400 hover:border-white/[0.15] hover:bg-[#161924] hover:text-zinc-200 transition-all shadow-sm"
          title="Open command menu (⌘K)"
        >
          <Search size={13} className="text-zinc-500" />
          <span className="hidden md:inline">Search applications, companies, ATS...</span>
          <span className="md:hidden">Search...</span>
          <div className="flex items-center gap-0.5 rounded border border-white/[0.1] bg-[#161924] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Live Telemetry Status Pill */}
        <button
          onClick={onOpenTelemetry}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#10121a] px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#161924] hover:text-white transition-colors"
          title="View application activity"
        >
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-zinc-300">
            {activeAutomationsCount} Applications in progress
          </span>
          <Cpu size={13} className="text-zinc-500" />
        </button>

        {/* Human Review Gate Badge */}
        {pendingReviewCount > 0 && (
          <button
            onClick={onFilterReviewGate}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-all shadow-glow-amber"
            title="Questions requiring candidate review before automated submission"
          >
            <ShieldCheck size={14} className="text-amber-400" />
            <span>{pendingReviewCount} Needs Review</span>
          </button>
        )}

        {/* Ingest Job URL Button */}
        <button
          onClick={onOpenAddJob}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 active:scale-[0.98] transition-all shadow-glow-blue"
        >
          <Plus size={14} />
          <span className="font-medium hidden sm:inline">Add job link</span>
          <span className="font-medium sm:hidden">Add job</span>
        </button>

        {/* User profile avatar */}
        <div className="hidden sm:flex items-center pl-2 border-l border-white/[0.08]">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-[#161924] border border-white/[0.08] text-xs font-semibold text-zinc-200">
            +
            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
