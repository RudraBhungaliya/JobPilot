"use client";

import React, { useState } from "react";
import { Application, PIPELINE_STAGES, getTierColor, getStatusLabel, getStatusColor, sortByTier } from "../lib/mock-data";
import {
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  FileText,
  MapPin,
  Clock,
  Cpu,
  Zap,
  Star,
  XCircle,
  Award,
  CheckCircle,
} from "./icons";

interface PipelineTableProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onOpenReviewModal: (app: Application) => void;
  onOpenTelemetryModal: (app: Application) => void;
  onMoveStage?: (appId: string, newStage: Application["status"]) => void;
  onRejectApplication?: (appId: string, reason?: string) => void;
}

export function PipelineTable({
  applications,
  onSelectApplication,
  onOpenReviewModal,
  onOpenTelemetryModal,
  onMoveStage,
  onRejectApplication,
}: PipelineTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const sortedApps = sortByTier(applications);

  const stageList: Application["status"][] = [
    "SAVED",
    "TAILORING",
    "WAITING_FOR_USER",
    "QUEUED",
    "SUBMITTED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ];

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#10121a] shadow-card-dark">
      {/* Greenhouse Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-blue-500/10 px-4 py-2.5 text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedIds.length} candidate applications selected</span>
          </div>
          <div className="flex items-center gap-2">
            {onMoveStage && (
              <button
                onClick={() => {
                  selectedIds.forEach((id) => onMoveStage(id, "SUBMITTED"));
                  setSelectedIds([]);
                }}
                className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <CheckCircle size={12} />
                Advance Selected
              </button>
            )}
            {onRejectApplication && (
              <button
                onClick={() => {
                  selectedIds.forEach((id) => onRejectApplication(id, "Bulk Rejected"));
                  setSelectedIds([]);
                }}
                className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
              >
                <XCircle size={12} />
                Archive / Reject
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="rounded border border-white/[0.08] bg-[#161924] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/[0.08] bg-[#161924] text-[11px] font-medium text-zinc-400">
            <tr>
              <th className="w-10 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={
                    applications.length > 0 &&
                    selectedIds.length === applications.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Company & ATS</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Tier Priority</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Job Title & Location</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Greenhouse Stage</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Match Fit</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Compensation</th>
              <th className="px-3.5 py-3 font-semibold text-zinc-300">Scorecard</th>
              <th className="px-3.5 py-3 text-right font-semibold text-zinc-300">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {sortedApps.map((app) => {
              const isSelected = selectedIds.includes(app.id);
              const isWaiting = app.status === "WAITING_FOR_USER";
              const isRunning = app.status === "RUNNING";
              const isRejected = app.status === "REJECTED";
              const isOffer = app.status === "OFFER";
              const tierColors = getTierColor(app.company.tier);
              const statusColors = getStatusColor(app.status);

              const currentIdx = stageList.indexOf(app.status);
              const nextStage = currentIdx < stageList.length - 2 ? stageList[currentIdx + 1] : null;

              return (
                <tr
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className={`group transition-colors hover:bg-[#161924]/70 cursor-pointer ${
                    isSelected ? "bg-blue-500/10" : isRejected ? "opacity-60" : ""
                  }`}
                >
                  <td
                    className="w-10 px-3 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(app.id)}
                      className="rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Company + ATS */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-[11px] font-bold text-zinc-100 ${tierColors.bg} ${tierColors.border} ${tierColors.glow}`}>
                        {app.company.logoText}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                          {app.company.name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="rounded bg-[#1c202e] px-1 py-0.2 font-mono text-[9px] text-zinc-400 border border-white/[0.05]">
                            {app.atsProvider}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {app.company.domain}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="px-3.5 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border ${tierColors.bg} ${tierColors.text} ${tierColors.border}`}
                    >
                      {app.company.tier}-Tier
                    </span>
                  </td>

                  {/* Role & Location */}
                  <td className="px-3.5 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-200 line-clamp-1 max-w-xs">
                        {app.jobTitle}
                      </span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-zinc-500" />
                        {app.location} ({app.workMode})
                      </span>
                    </div>
                  </td>

                  {/* Stage Switcher */}
                  <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={app.status}
                      onChange={(e) => onMoveStage && onMoveStage(app.id, e.target.value as Application["status"])}
                      className={`rounded-lg border px-2 py-1 font-mono text-[11px] font-semibold bg-[#090a0f] focus:outline-none cursor-pointer ${statusColors.border} ${statusColors.text}`}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Match Fit */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {app.matchScore}%
                      </span>
                      <span className="text-[10px] text-zinc-500">Fit</span>
                    </div>
                  </td>

                  {/* Compensation */}
                  <td className="px-3.5 py-3">
                    <span className="font-medium text-zinc-200">
                      {app.salaryRange || "Not disclosed"}
                    </span>
                  </td>

                  {/* Scorecard */}
                  <td className="px-3.5 py-3">
                    {app.scorecard ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        {app.scorecard.overallRecommendation}
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-mono text-[10px]">Pending loop</span>
                    )}
                  </td>

                  {/* Quick Actions */}
                  <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {isWaiting && (
                        <button
                          onClick={() => onOpenReviewModal(app)}
                          className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-black hover:bg-amber-400 transition-colors shadow-sm"
                        >
                          Review Gate
                        </button>
                      )}

                      {nextStage && !isRejected && !isWaiting && (
                        <button
                          onClick={() => onMoveStage && onMoveStage(app.id, nextStage)}
                          className="flex items-center gap-1 rounded border border-white/[0.08] bg-[#161924] px-2 py-1 text-[10px] font-medium text-zinc-300 hover:text-white hover:border-white/[0.18] transition-colors"
                        >
                          <span>Advance</span>
                          <ChevronRight size={11} />
                        </button>
                      )}

                      <button
                        onClick={() => onSelectApplication(app)}
                        className="rounded p-1 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                        title="View Full Application"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
