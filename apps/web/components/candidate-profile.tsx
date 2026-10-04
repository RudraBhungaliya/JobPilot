"use client";

import React, { useState } from "react";
import { CandidateProfile } from "../lib/mock-data";
import {
  User,
  ShieldCheck,
  Sliders,
  Bell,
  Lock,
  CheckCircle,
  ExternalLink,
  Activity,
  Cpu,
  Globe,
} from "./icons";

interface CandidateProfileProps {
  profile: CandidateProfile;
  onSaveProfile: (updated: CandidateProfile) => void;
}

export function CandidateProfileView({ profile, onSaveProfile }: CandidateProfileProps) {
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"identity" | "governor" | "eeo" | "alerts">("governor");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-6 max-w-6xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <User size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
              Candidate Master Vault & Autonomous Engine Settings
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Verified candidate profile, anti-shadowban rate limiting, EEO presets, and stealth agent controls.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 active:scale-[0.98] shadow-glow-blue transition-all self-start"
        >
          {savedSuccess ? (
            <>
              <CheckCircle size={13} className="text-emerald-300" />
              <span>Vault Synced</span>
            </>
          ) : (
            <span>Save Configuration</span>
          )}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-white/[0.08] text-xs gap-6">
        <button
          onClick={() => setActiveSubTab("governor")}
          className={`pb-3 font-medium transition-colors border-b-2 ${
            activeSubTab === "governor"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Rate Governor & Stealth Execution
        </button>
        <button
          onClick={() => setActiveSubTab("identity")}
          className={`pb-3 font-medium transition-colors border-b-2 ${
            activeSubTab === "identity"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Candidate Identity & Portfolio
        </button>
        <button
          onClick={() => setActiveSubTab("eeo")}
          className={`pb-3 font-medium transition-colors border-b-2 ${
            activeSubTab === "eeo"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          EEO Voluntary Disclosures
        </button>
        <button
          onClick={() => setActiveSubTab("alerts")}
          className={`pb-3 font-medium transition-colors border-b-2 ${
            activeSubTab === "alerts"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Notification Channels
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SUBTAB: Rate Governor & Stealth Execution */}
        {activeSubTab === "governor" && (
          <div className="space-y-5">
            {/* Informational Callout */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-zinc-300 flex items-start gap-3">
              <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-zinc-100 block">
                  Anti-Shadowban Automation Protections
                </span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  ATS providers (Greenhouse, Ashby, Lever, Workday) analyze submission rates, browser fingerprints, and typing cadences. JobPilot enforces random timing jitter and daily application quotas to protect your professional candidate standing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily Cap */}
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2 shadow-card-dark">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-100">
                    Max Daily Applications Quota
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {formData.rateGovernorSettings.maxDailyApplications} / day
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Recommended: 10–18 applications/day to avoid triggering ATS IP throttling.
                </p>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={formData.rateGovernorSettings.maxDailyApplications}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateGovernorSettings: {
                        ...formData.rateGovernorSettings,
                        maxDailyApplications: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Delay between submissions */}
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2 shadow-card-dark">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-100">
                    Delay Between Submissions
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {formData.rateGovernorSettings.delayBetweenSubmissionsMinutes} mins
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Minimum spacing between automated submissions in the BullMQ queue.
                </p>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={formData.rateGovernorSettings.delayBetweenSubmissionsMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rateGovernorSettings: {
                        ...formData.rateGovernorSettings,
                        delayBetweenSubmissionsMinutes: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-3 shadow-card-dark">
              <h3 className="text-xs font-semibold text-zinc-100">Stealth Execution Options</h3>

              <div className="divide-y divide-white/[0.05] text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Humanized Keystroke Cadence</span>
                    <span className="text-[11px] text-zinc-500">
                      Simulates natural typing pauses (40–120ms) instead of instant programmatic paste.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.rateGovernorSettings.stealthMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateGovernorSettings: {
                          ...formData.rateGovernorSettings,
                          stealthMode: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Turnstile / Cloudflare Solver</span>
                    <span className="text-[11px] text-zinc-500">
                      Auto-detects and solves interactive verification checkboxes via mouse curve simulation.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.rateGovernorSettings.autoSolveTurnstile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateGovernorSettings: {
                          ...formData.rateGovernorSettings,
                          autoSolveTurnstile: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Always Pause on Custom Essays</span>
                    <span className="text-[11px] text-zinc-500">
                      Routes any non-standard open-ended questions to the Human Review Gate for your approval.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.rateGovernorSettings.pauseOnCustomEssays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateGovernorSettings: {
                          ...formData.rateGovernorSettings,
                          pauseOnCustomEssays: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Residential Proxy Pool</span>
                    <span className="text-[11px] text-zinc-500">
                      Rotates US domestic IP gateways to prevent datacenter IP blacklisting.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.rateGovernorSettings.useProxyPool}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateGovernorSettings: {
                          ...formData.rateGovernorSettings,
                          useProxyPool: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Candidate Identity */}
        {activeSubTab === "identity" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <h3 className="text-xs font-semibold text-zinc-100">Master Candidate Profile</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Primary Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Location / Timezone</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Work Authorization</label>
                <select
                  value={formData.workAuthorization}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workAuthorization: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="US Citizen">US Citizen</option>
                  <option value="Permanent Resident (Green Card)">Permanent Resident (Green Card)</option>
                  <option value="Requires H-1B / Visa Transfer">Requires H-1B / Visa Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={formData.linkedIn}
                  onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">GitHub / Code Portfolio</label>
                <input
                  type="text"
                  value={formData.github}
                  onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: EEO Presets */}
        {activeSubTab === "eeo" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  Voluntary Equal Employment Opportunity (EEO) Defaults
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Automatically filled on US federal compliance questionnaire sections.
                </p>
              </div>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-blue-500/20">
                Encrypted Vault
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="text-zinc-400 block mb-1">Gender Identification</label>
                <input
                  type="text"
                  value={formData.eeoPreferences.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eeoPreferences: { ...formData.eeoPreferences, gender: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Race / Ethnicity</label>
                <input
                  type="text"
                  value={formData.eeoPreferences.race}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eeoPreferences: { ...formData.eeoPreferences, race: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Veteran Status</label>
                <input
                  type="text"
                  value={formData.eeoPreferences.veteranStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eeoPreferences: { ...formData.eeoPreferences, veteranStatus: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Disability Status</label>
                <input
                  type="text"
                  value={formData.eeoPreferences.disabilityStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eeoPreferences: { ...formData.eeoPreferences, disabilityStatus: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Notification Channels */}
        {activeSubTab === "alerts" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <h3 className="text-xs font-semibold text-zinc-100">
              Notification Webhooks & Escalation Alerts
            </h3>
            <p className="text-[11px] text-zinc-400">
              Receive immediate alerts on Telegram or Discord when an application requires human review or an interview invitation is parsed.
            </p>

            <div className="space-y-4 text-xs pt-2">
              <div className="rounded-lg border border-white/[0.08] bg-[#161924] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">Telegram Bot Notifications</span>
                  <input
                    type="checkbox"
                    checked={formData.notificationChannels.telegramEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationChannels: {
                          ...formData.notificationChannels,
                          telegramEnabled: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="@your_telegram_username"
                  value={formData.notificationChannels.telegramChatId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notificationChannels: {
                        ...formData.notificationChannels,
                        telegramChatId: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-md border border-white/[0.08] bg-[#10121a] p-2 text-zinc-200 text-xs focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-[#161924] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">Discord Channel Webhook</span>
                  <input
                    type="checkbox"
                    checked={formData.notificationChannels.discordWebhookEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationChannels: {
                          ...formData.notificationChannels,
                          discordWebhookEnabled: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={formData.notificationChannels.discordWebhookUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notificationChannels: {
                        ...formData.notificationChannels,
                        discordWebhookUrl: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-md border border-white/[0.08] bg-[#10121a] p-2 text-zinc-200 text-xs focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
