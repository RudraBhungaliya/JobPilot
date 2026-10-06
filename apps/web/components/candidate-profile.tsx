"use client";

import React, { useState } from "react";
import { CandidateProfile } from "../lib/mock-data";
import {
  User,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Globe,
  Sliders,
  Bell,
  Lock,
} from "./icons";

interface CandidateProfileProps {
  profile: CandidateProfile;
  onSaveProfile: (updated: CandidateProfile) => void;
}

export function CandidateProfileView({ profile, onSaveProfile }: CandidateProfileProps) {
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "identity" | "links" | "experience" | "compliance" | "governor" | "eeo" | "alerts"
  >("identity");

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
            Complete candidate data vault for automated multi-ATS form filling (Greenhouse, Lever, Ashby, Workday).
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
      <div className="flex border-b border-white/[0.08] text-xs gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("identity")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "identity"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Identity & Contact
        </button>
        <button
          onClick={() => setActiveSubTab("links")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "links"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Portfolios & Repos
        </button>
        <button
          onClick={() => setActiveSubTab("experience")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "experience"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Experience & Education
        </button>
        <button
          onClick={() => setActiveSubTab("compliance")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "compliance"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Work Auth & Legal
        </button>
        <button
          onClick={() => setActiveSubTab("governor")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "governor"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Rate Governor & Stealth
        </button>
        <button
          onClick={() => setActiveSubTab("eeo")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeSubTab === "eeo"
              ? "border-blue-500 text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          EEO Presets
        </button>
        <button
          onClick={() => setActiveSubTab("alerts")}
          className={`pb-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
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
        {/* SUBTAB: Candidate Identity & Contact */}
        {activeSubTab === "identity" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold text-zinc-100">Personal & Contact Coordinates</h3>
              <span className="text-[11px] text-zinc-500 font-mono">Mapped to ATS Name & Address Fields</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) => {
                    const first = e.target.value;
                    setFormData({
                      ...formData,
                      firstName: first,
                      fullName: `${first} ${formData.middleName ? formData.middleName + " " : ""}${formData.lastName}`.trim(),
                    });
                  }}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ""}
                  onChange={(e) => {
                    const mid = e.target.value;
                    setFormData({
                      ...formData,
                      middleName: mid,
                      fullName: `${formData.firstName} ${mid ? mid + " " : ""}${formData.lastName}`.trim(),
                    });
                  }}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) => {
                    const last = e.target.value;
                    setFormData({
                      ...formData,
                      lastName: last,
                      fullName: `${formData.firstName} ${formData.middleName ? formData.middleName + " " : ""}${last}`.trim(),
                    });
                  }}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Preferred Name / Nickname</label>
                <input
                  type="text"
                  value={formData.preferredName || ""}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Pronouns</label>
                <input
                  type="text"
                  placeholder="e.g. He / Him, She / Her, They / Them"
                  value={formData.pronouns || ""}
                  onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Primary Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Phone Country Code</label>
                <input
                  type="text"
                  placeholder="+91 or +1"
                  value={formData.phoneCountryCode || ""}
                  onChange={(e) => setFormData({ ...formData, phoneCountryCode: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Primary Phone Number *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Secondary / Alternate Phone</label>
                <input
                  type="text"
                  value={formData.secondaryPhone || ""}
                  onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 block mb-1">Street Address Line 1</label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Address Line 2 (Apt / Suite)</label>
                <input
                  type="text"
                  value={formData.addressLine2 || ""}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">City</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">State / Province</label>
                <input
                  type="text"
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Postal / ZIP / PIN Code</label>
                <input
                  type="text"
                  value={formData.zipCode || ""}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 block mb-1">Current Location / Timezone Display</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Portfolios & Repos */}
        {activeSubTab === "links" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold text-zinc-100">Professional Links & Online Presence</h3>
              <span className="text-[11px] text-zinc-500 font-mono">Mapped to ATS URL & Profile Fields</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={formData.linkedIn}
                  onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">GitHub Profile URL</label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Portfolio Website</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Personal Website / Blog</label>
                <input
                  type="url"
                  value={formData.website || ""}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Twitter / X Profile</label>
                <input
                  type="url"
                  value={formData.twitter || ""}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">LeetCode Profile</label>
                <input
                  type="url"
                  value={formData.leetcode || ""}
                  onChange={(e) => setFormData({ ...formData, leetcode: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Codeforces / Competitive Programming</label>
                <input
                  type="url"
                  value={formData.codeforces || ""}
                  onChange={(e) => setFormData({ ...formData, codeforces: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Stack Overflow Profile</label>
                <input
                  type="url"
                  value={formData.stackoverflow || ""}
                  onChange={(e) => setFormData({ ...formData, stackoverflow: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Kaggle Profile</label>
                <input
                  type="url"
                  value={formData.kaggle || ""}
                  onChange={(e) => setFormData({ ...formData, kaggle: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Dribbble / Behance (Design)</label>
                <input
                  type="url"
                  value={formData.dribbble || formData.behance || ""}
                  onChange={(e) => setFormData({ ...formData, dribbble: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Experience & Education */}
        {activeSubTab === "experience" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold text-zinc-100">Experience, Compensation & Education</h3>
              <span className="text-[11px] text-zinc-500 font-mono">Mapped to ATS Role, Salary & Degree Prompts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Primary Current / Target Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Current Employer / Company</label>
                <input
                  type="text"
                  value={formData.currentCompany || ""}
                  onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Total Years of Experience *</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Notice Period (Days) *</label>
                <input
                  type="number"
                  placeholder="0 for Immediate, 15, 30, 60, 90"
                  value={formData.noticePeriod ?? 15}
                  onChange={(e) => setFormData({ ...formData, noticePeriod: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Earliest Available Start Date</label>
                <input
                  type="date"
                  value={formData.availableStartDate || ""}
                  onChange={(e) => setFormData({ ...formData, availableStartDate: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Salary Currency</label>
                <select
                  value={formData.salaryCurrency || "USD"}
                  onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Current Annual Salary</label>
                <input
                  type="number"
                  value={formData.currentSalary || ""}
                  onChange={(e) => setFormData({ ...formData, currentSalary: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Minimum Desired Salary</label>
                <input
                  type="number"
                  value={formData.desiredSalaryMin}
                  onChange={(e) => setFormData({ ...formData, desiredSalaryMin: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Target Desired Salary</label>
                <input
                  type="number"
                  value={formData.desiredSalaryTarget}
                  onChange={(e) => setFormData({ ...formData, desiredSalaryTarget: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Highest Degree Attained</label>
                <input
                  type="text"
                  placeholder="Master of Science / Bachelor of Technology"
                  value={formData.highestDegree || ""}
                  onChange={(e) => setFormData({ ...formData, highestDegree: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Field of Study / Major</label>
                <input
                  type="text"
                  placeholder="Computer Science / Electrical Engineering"
                  value={formData.fieldOfStudy || ""}
                  onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Institution / University</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University / IIT Bombay"
                  value={formData.institution || ""}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Graduation Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2020"
                  value={formData.graduationYear || ""}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">GPA / Grade / Percentage</label>
                <input
                  type="text"
                  placeholder="e.g. 3.9/4.0 or 8.8/10.0"
                  value={formData.gpa || ""}
                  onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Preferred Work Mode</label>
                <select
                  value={formData.workMode || "Remote"}
                  onChange={(e) => setFormData({ ...formData, workMode: e.target.value as any })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-zinc-400 block mb-1">Core Technical Skills (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-zinc-400 block mb-1">Professional Executive Summary / Bio</label>
                <textarea
                  rows={3}
                  value={formData.summary || ""}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Work Authorization & Legal */}
        {activeSubTab === "compliance" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-5 space-y-4 shadow-card-dark">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">Work Authorization, Visa & Compliance Defaults</h3>
                <p className="text-[11px] text-zinc-400">
                  Pre-configured truthful answers for legal screening questions.
                </p>
              </div>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-blue-500/20">
                Verified Truth Vault
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Work Authorization Status</label>
                <select
                  value={formData.workAuthorization}
                  onChange={(e) => setFormData({ ...formData, workAuthorization: e.target.value as any })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="India Citizen / Eligible">India Citizen / Eligible to work in India</option>
                  <option value="US Citizen">US Citizen</option>
                  <option value="Permanent Resident (Green Card)">Permanent Resident (Green Card)</option>
                  <option value="Requires H-1B / Visa Transfer">Requires H-1B / Visa Transfer</option>
                  <option value="Requires UK/EU Sponsorship">Requires UK/EU Sponsorship</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Current Specific Visa Status (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Citizen, H-1B, F-1 OPT, Stem OPT"
                  value={formData.visaStatus || ""}
                  onChange={(e) => setFormData({ ...formData, visaStatus: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Security Clearance</label>
                <select
                  value={formData.clearanceLevel}
                  onChange={(e) => setFormData({ ...formData, clearanceLevel: e.target.value as any })}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#161924] p-2 text-zinc-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="None">None</option>
                  <option value="Secret">Secret</option>
                  <option value="Top Secret">Top Secret</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sponsorshipRequired || false}
                    onChange={(e) => setFormData({ ...formData, sponsorshipRequired: e.target.checked })}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  <span className="text-zinc-200">Will you now or in the future require visa sponsorship?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is18OrOlder ?? true}
                    onChange={(e) => setFormData({ ...formData, is18OrOlder: e.target.checked })}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  <span className="text-zinc-200">Are you 18 years of age or older?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.previousEmployee || false}
                    onChange={(e) => setFormData({ ...formData, previousEmployee: e.target.checked })}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  <span className="text-zinc-200">Have you previously worked for this company?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.nonCompeteAgreement || false}
                    onChange={(e) => setFormData({ ...formData, nonCompeteAgreement: e.target.checked })}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  <span className="text-zinc-200">Are you bound by any non-compete agreements?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.willingToRelocate ?? true}
                    onChange={(e) => setFormData({ ...formData, willingToRelocate: e.target.checked })}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  <span className="text-zinc-200">Willing to relocate for the role?</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: Rate Governor & Stealth Execution */}
        {activeSubTab === "governor" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-zinc-300 flex items-start gap-3">
              <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-zinc-100 block">
                  Anti-Shadowban Automation Protections
                </span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  JobPilot enforces random timing jitter (4.5s – 11.2s) and rate throttling across Greenhouse, Lever, Ashby, and Workday to maintain genuine human candidate telemetry.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2 shadow-card-dark">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-100">
                    Max Daily Applications Quota
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {formData.rateGovernorSettings.maxDailyApplications} / day
                  </span>
                </div>
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

              <div className="rounded-xl border border-white/[0.08] bg-[#10121a] p-4 space-y-2 shadow-card-dark">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-100">
                    Delay Between Submissions
                  </label>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {formData.rateGovernorSettings.delayBetweenSubmissionsMinutes} mins
                  </span>
                </div>
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
                    className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Turnstile / Cloudflare Solver</span>
                    <span className="text-[11px] text-zinc-500">
                      Detects and pauses on interactive verification checkboxes for human resolution.
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
                    className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-zinc-200 block">Always Pause on Custom Essays</span>
                    <span className="text-[11px] text-zinc-500">
                      Routes non-standard open-ended questions to the Human Review Gate.
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
                    className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                  />
                </div>
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
                  Automatically populated on US federal compliance questionnaire sections.
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
              Receive immediate alerts on Telegram or Discord when an application requires human review.
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
