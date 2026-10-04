"use client";

import React, { useState, useEffect } from "react";
import { Application } from "../lib/mock-data";
import {
  Search,
  Command,
  Plus,
  ShieldCheck,
  Cpu,
  Kanban,
  TableIcon,
  X,
  ChevronRight,
  Compass,
  User,
  FileText,
  Terminal,
  Zap,
} from "./icons";
import { NavTab } from "./sidebar";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onOpenAddJob: () => void;
  onOpenTelemetry: () => void;
  onSelectTab: (tab: NavTab) => void;
  onToggleViewMode: () => void;
  viewMode: "kanban" | "table";
}

export function CommandMenu({
  isOpen,
  onClose,
  applications,
  onSelectApplication,
  onOpenAddJob,
  onOpenTelemetry,
  onSelectTab,
  onToggleViewMode,
  viewMode,
}: CommandMenuProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredApps = applications.filter((app) => {
    const term = query.toLowerCase();
    return (
      app.jobTitle.toLowerCase().includes(term) ||
      app.company.name.toLowerCase().includes(term) ||
      app.atsProvider.toLowerCase().includes(term) ||
      app.location.toLowerCase().includes(term)
    );
  });

  const quickActions = [
    {
      label: "Ingest New Job URL (Greenhouse, Ashby, Lever)",
      icon: Plus,
      iconBg: "bg-blue-500/10 text-blue-400",
      kbd: "N",
      action: () => { onOpenAddJob(); onClose(); },
    },
    {
      label: "Jump to Human Review Gate",
      icon: ShieldCheck,
      iconBg: "bg-amber-500/10 text-amber-400",
      kbd: "R",
      action: () => { onSelectTab("reviews"); onClose(); },
    },
    {
      label: "Open ATS Job Discovery Feed",
      icon: Compass,
      iconBg: "bg-blue-500/10 text-blue-400",
      kbd: "D",
      action: () => { onSelectTab("discovery"); onClose(); },
    },
    {
      label: "Open Playwright Telemetry Console",
      icon: Terminal,
      iconBg: "bg-emerald-500/10 text-emerald-400",
      kbd: "T",
      action: () => { onOpenTelemetry(); onClose(); },
    },
    {
      label: "Resume & ATS Tailoring Studio",
      icon: FileText,
      iconBg: "bg-purple-500/10 text-purple-400",
      kbd: "F",
      action: () => { onSelectTab("resumes"); onClose(); },
    },
    {
      label: `Switch to ${viewMode === "kanban" ? "Table View" : "Kanban Board View"}`,
      icon: viewMode === "kanban" ? TableIcon : Kanban,
      iconBg: "bg-zinc-800 text-zinc-300",
      kbd: "V",
      action: () => { onToggleViewMode(); onClose(); },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-20 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-xl flex-col rounded-2xl border border-white/[0.12] bg-[#10121a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 bg-[#161924]">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, company name, role, or ATS..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 text-xs divide-y divide-white/[0.04]">

          {/* Quick Actions */}
          {!query && (
            <div className="py-1.5 space-y-0.5">
              <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Quick Actions
              </div>

              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-zinc-200 hover:bg-[#1c202e] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${action.iconBg}`}>
                        <Icon size={13} />
                      </div>
                      <span>{action.label}</span>
                    </div>
                    <kbd className="font-mono text-[10px] text-zinc-500 rounded border border-white/[0.08] bg-[#0c0e15] px-1.5 py-0.5">
                      {action.kbd}
                    </kbd>
                  </button>
                );
              })}
            </div>
          )}

          {/* Application Search Matches */}
          <div className="py-1.5 space-y-0.5">
            <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Active Applications ({filteredApps.length})
            </div>

            {filteredApps.length === 0 && query && (
              <div className="px-3 py-4 text-center text-zinc-500">
                No applications matching &quot;{query}&quot;
              </div>
            )}

            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => {
                  onSelectApplication(app);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-zinc-200 hover:bg-[#1c202e] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1c202e] border border-white/[0.05] font-mono text-[10px] font-bold text-zinc-200">
                    {app.company.logoText}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-100">
                      {app.company.name} &middot; {app.jobTitle}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {app.status} &middot; {app.atsProvider} &middot; {app.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-emerald-400">
                    {app.matchScore}%
                  </span>
                  <ChevronRight size={12} className="text-zinc-500" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161924] px-4 py-2.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-white/[0.08] bg-[#0c0e15] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="rounded border border-white/[0.08] bg-[#0c0e15] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span>
              <kbd className="rounded border border-white/[0.08] bg-[#0c0e15] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>
          <span className="font-mono text-zinc-600">JobPilot Command Palette</span>
        </div>
      </div>
    </div>
  );
}
