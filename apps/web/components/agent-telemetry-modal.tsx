"use client";

import React, { useState } from "react";
import { Application } from "../lib/mock-data";
import {
  X,
  Cpu,
  Terminal,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle,
  Zap,
} from "./icons";

interface AgentTelemetryModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  isQueuePaused: boolean;
  onTogglePauseQueue: () => void;
}

export function AgentTelemetryModal({
  application,
  isOpen,
  onClose,
  isQueuePaused,
  onTogglePauseQueue,
}: AgentTelemetryModalProps) {
  const [activeView, setActiveView] = useState<"logs" | "flow" | "dom">("flow");
  const [logFilter, setLogFilter] = useState<"ALL" | "INFO" | "SUCCESS" | "WARN">("ALL");

  if (!isOpen) return null;

  const currentApp = application;

  const filteredLogs = currentApp?.telemetryLogs.filter((l) => {
    if (logFilter === "ALL") return true;
    return l.level === logFilter;
  }) || [];

  const automationSteps = [
    { step: "1. Headless Browser Initialization", status: "completed", desc: "Chromium context created with stealth plugins & anti-fingerprinting." },
    { step: "2. ATS DOM Form Discovery", status: "completed", desc: "Ashby / Greenhouse DOM tree parsed, 18 form selectors identified." },
    { step: "3. Vector Resume & Profile Mapping", status: "completed", desc: "Injected tailored PDF and matched candidate identity attributes." },
    { step: "4. Human Verification Checkpoint", status: currentApp?.status === "WAITING_FOR_USER" ? "active" : "completed", desc: "Custom essays & compensation preferences routed to Human Review Gate." },
    { step: "5. Final Submission & Confirmation Receipt", status: currentApp?.status === "SUBMITTED" ? "completed" : "pending", desc: "Verification token captured & encrypted in candidate submission receipts vault." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/[0.12] bg-[#10121a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#161924] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25">
              <Cpu size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Playwright Browser Agent Telemetry
                </h3>
                <span className="flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Worker Node #01
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Target: {currentApp ? `${currentApp.company.name} (${currentApp.atsProvider} ATS)` : "All Active Workers"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePauseQueue}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isQueuePaused
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.08] bg-[#10121a] text-zinc-300 hover:text-white"
              }`}
            >
              {isQueuePaused ? (
                <>
                  <Play size={12} className="text-emerald-400" />
                  <span>Resume Runner</span>
                </>
              ) : (
                <>
                  <Pause size={12} className="text-zinc-500" />
                  <span>Pause Runner</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Runtime Metrics Bar */}
        <div className="grid grid-cols-4 divide-x divide-white/[0.08] border-b border-white/[0.08] bg-[#10121a] px-6 py-2.5 text-xs">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Browser Engine</span>
            <p className="font-medium text-zinc-200 pt-0.5 font-mono text-[11px]">Playwright v1.62.1</p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Stealth Mode</span>
            <p className="font-medium text-emerald-400 pt-0.5">Active (Fingerprint OK)</p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">DOM Latency</span>
            <p className="font-medium text-zinc-200 pt-0.5 font-mono text-[11px]">182 ms</p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Queue Rate</span>
            <p className="font-medium text-zinc-200 pt-0.5">4 / 15 Daily Limit</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c0e15] px-6 text-xs">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveView("flow")}
              className={`py-3 font-medium border-b-2 transition-colors ${
                activeView === "flow"
                  ? "border-blue-500 text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Automation Execution Steps
            </button>
            <button
              onClick={() => setActiveView("logs")}
              className={`py-3 font-medium border-b-2 transition-colors ${
                activeView === "logs"
                  ? "border-blue-500 text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Playwright Console Logs ({filteredLogs.length})
            </button>
          </div>

          {activeView === "logs" && (
            <div className="flex items-center gap-1">
              {(["ALL", "INFO", "SUCCESS", "WARN"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium transition-colors ${
                    logFilter === lvl
                      ? "bg-blue-600 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4 font-mono">
          {activeView === "flow" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#161924] p-4 text-xs font-sans text-zinc-300 space-y-1">
                <span className="font-semibold text-zinc-100 block">
                  Autonomous Browser Session: {currentApp?.company.name}
                </span>
                <p className="text-[11px] text-zinc-400">
                  Target ATS Endpoint: <span className="font-mono text-blue-400">{currentApp?.jobUrl}</span>
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {automationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 flex items-start gap-3 transition-all ${
                      step.status === "completed"
                        ? "border-emerald-500/25 bg-emerald-500/5 text-zinc-200"
                        : step.status === "active"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-white/[0.08] bg-[#0c0e15] text-zinc-500"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {step.status === "completed" && <CheckCircle size={15} className="text-emerald-400" />}
                      {step.status === "active" && <ShieldCheck size={15} className="text-amber-400 animate-pulse" />}
                      {step.status === "pending" && <div className="h-3.5 w-3.5 rounded-full border border-zinc-700"></div>}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-zinc-100">{step.step}</div>
                      <p className="text-[11px] text-zinc-400 font-sans">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "logs" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#090a0f] p-4 space-y-2 text-xs leading-relaxed max-h-[460px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-600 py-6 text-center">No logs matching filter.</div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 text-[11px]">
                    <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === "SUCCESS"
                          ? "text-emerald-400"
                          : log.level === "WARN"
                          ? "text-amber-400"
                          : log.level === "ERROR"
                          ? "text-rose-400"
                          : "text-blue-400"
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-zinc-400 font-semibold shrink-0">{log.step}:</span>
                    <span className="text-zinc-200">{log.detail}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#161924] px-6 py-3 rounded-b-2xl text-xs">
          <span className="text-[11px] text-zinc-500">Playwright Runtime Worker Node: Online</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] bg-[#10121a] px-3.5 py-1.5 font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
