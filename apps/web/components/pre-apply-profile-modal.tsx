"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Briefcase,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Building,
  Layers,
} from "lucide-react";

export interface PreApplyProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  // Education
  institution: string;
  highestDegree: string;
  fieldOfStudy: string;
  graduationYear: string;
  // Experience
  currentTitle: string;
  currentCompany: string;
  yearsOfExperience: number;
  experienceDescription: string;
  // Skills & Links
  skills: string[];
  linkedin: string;
  github: string;
  portfolio: string;
  // Preferences
  workMode: "REMOTE" | "HYBRID" | "ONSITE";
  noticePeriodDays: number;
  workAuthorization: string;
  sponsorshipRequired: boolean;
}

interface PreApplyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  targetJob?: {
    id?: string;
    title: string;
    company: string;
    location?: string;
    atsProvider?: string;
  } | null;
  onConfirmApply: (updatedProfile: PreApplyProfileData) => Promise<void>;
}

function buildInitialProfileData(profile: any): PreApplyProfileData {
  const firstEdu = Array.isArray(profile?.educations) && profile.educations.length > 0
    ? profile.educations[0]
    : null;
  const firstExp = Array.isArray(profile?.experiences) && profile.experiences.length > 0
    ? profile.experiences[0]
    : null;

  const skillsList = Array.isArray(profile?.skills)
    ? profile.skills.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean)
    : [];

  return {
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    email: profile?.email || "rudrabhungaliya@gmail.com",
    phone: profile?.phone || "",
    city: profile?.city || "Ahmedabad",
    country: profile?.country || "India",
    institution: firstEdu?.institution || profile?.institution || "Pandit Deendayal Energy University, Gandhinagar",
    highestDegree: firstEdu?.degree || profile?.highestDegree || "B.Tech Computer Science & Engineering (CSE '28)",
    fieldOfStudy: firstEdu?.fieldOfStudy || profile?.fieldOfStudy || "Computer Science and Engineering",
    graduationYear: profile?.graduationYear || "2028",
    currentTitle: firstExp?.title || profile?.currentTitle || "SDE Intern",
    currentCompany: firstExp?.company || profile?.currentCompany || "nopCypher",
    yearsOfExperience: typeof profile?.yearsOfExperience === "number" ? profile.yearsOfExperience : 0.5,
    experienceDescription: firstExp?.description || profile?.experienceDescription || "SDE Intern @nopCypher",
    skills: skillsList.length > 0 ? skillsList : ["TypeScript", "React", "Node.js", "Next.js", "PostgreSQL", "C++"],
    linkedin: profile?.linkedin || "https://linkedin.com/in/rudrabhungaliya",
    github: profile?.github || "https://github.com/RudraBhungaliya",
    portfolio: profile?.portfolio || "https://rudra.dev",
    workMode: profile?.workMode || "HYBRID",
    noticePeriodDays: profile?.noticePeriodDays || 30,
    workAuthorization: profile?.workAuthorization || "Authorized to work in India",
    sponsorshipRequired: profile?.sponsorshipRequired || false,
  };
}

export function PreApplyProfileModal({
  isOpen,
  onClose,
  profile,
  targetJob,
  onConfirmApply,
}: PreApplyProfileModalProps) {
  const [formData, setFormData] = useState<PreApplyProfileData>(() => buildInitialProfileData(profile));
  const [skillsInput, setSkillsInput] = useState(() => (formData.skills || []).join(", "));
  const [activeTab, setActiveTab] = useState<"education" | "experience" | "identity" | "preferences">("education");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when profile reference changes externally
  const [lastProfileRef, setLastProfileRef] = useState(profile);
  if (profile !== lastProfileRef) {
    setLastProfileRef(profile);
    const initial = buildInitialProfileData(profile);
    setFormData(initial);
    setSkillsInput((initial.skills || []).join(", "));
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setActiveTab("identity");
      setErrorMessage("Please enter your candidate First and Last name.");
      return;
    }
    if (!formData.email.trim() || !formData.phone.trim()) {
      setActiveTab("identity");
      setErrorMessage("Please enter your contact Email and Phone number.");
      return;
    }
    if (!formData.institution.trim() || !formData.highestDegree.trim()) {
      setActiveTab("education");
      setErrorMessage("Education History (Institution & Degree) is required before applying so ATS loops don't get interrupted.");
      return;
    }
    if (!formData.currentCompany.trim() || !formData.currentTitle.trim()) {
      setActiveTab("experience");
      setErrorMessage("Work Experience (Company & Role) is required before applying.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSkills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const finalProfileData: PreApplyProfileData = {
        ...formData,
        skills: parsedSkills.length > 0 ? parsedSkills : formData.skills,
      };

      // 1. Sync full profile with PostgreSQL backend
      await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: finalProfileData.firstName,
          lastName: finalProfileData.lastName,
          email: finalProfileData.email,
          phone: finalProfileData.phone,
          city: finalProfileData.city,
          country: finalProfileData.country,
          currentTitle: finalProfileData.currentTitle,
          currentCompany: finalProfileData.currentCompany,
          yearsOfExperience: finalProfileData.yearsOfExperience,
          noticePeriod: finalProfileData.noticePeriodDays,
          noticePeriodDays: finalProfileData.noticePeriodDays,
          workMode: finalProfileData.workMode,
          github: finalProfileData.github,
          linkedin: finalProfileData.linkedin,
          portfolio: finalProfileData.portfolio,
          workAuthorization: finalProfileData.workAuthorization,
          sponsorshipRequired: finalProfileData.sponsorshipRequired,
          address: profile?.address || undefined,
          state: profile?.state || undefined,
          zipCode: profile?.zipCode || undefined,
          is18OrOlder: profile?.is18OrOlder ?? true,
          previousEmployee: profile?.previousEmployee ?? false,
          nonCompeteAgreement: profile?.nonCompeteAgreement ?? false,
          veteran: profile?.veteran,
          disability: profile?.disability,
          gender: profile?.gender,
          race: profile?.race,
          skills: finalProfileData.skills.map((name) => ({ name })),
          educations: [
            {
              institution: finalProfileData.institution,
              degree: finalProfileData.highestDegree,
              fieldOfStudy: finalProfileData.fieldOfStudy,
              currentlyStudying: true,
            },
          ],
          experiences: [
            {
              company: finalProfileData.currentCompany,
              title: finalProfileData.currentTitle,
              description: finalProfileData.experienceDescription || `${finalProfileData.currentTitle} at ${finalProfileData.currentCompany}`,
              currentlyWorking: true,
            },
          ],
        }),
      });

      // 2. Trigger apply callback with updated profile
      await onConfirmApply(finalProfileData);
      onClose();
    } catch (err: any) {
      console.error("Failed to complete pre-apply profile setup:", err);
      setErrorMessage(err.message || "Failed to update candidate profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d1017] shadow-2xl text-zinc-100 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Candidate Profile & Pre-Apply Setup
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={11} />
                  Vault Saved Once
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Provide your details before applying so JobPilot runs continuously without stopping for education or experience checkpoints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Job Banner (if applicable) */}
        {targetJob && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-xs">
            <div className="flex items-center gap-2">
              <Building size={14} className="text-blue-400" />
              <span className="text-zinc-300">
                Applying to: <strong className="text-white">{targetJob.title}</strong> at{" "}
                <strong className="text-blue-300">{targetJob.company}</strong>
              </span>
            </div>
            {targetJob.atsProvider && (
              <span className="font-mono text-[10px] uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {targetJob.atsProvider}
              </span>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] px-6 text-xs gap-4 bg-[#0a0c12]">
          <button
            type="button"
            onClick={() => setActiveTab("education")}
            className={`flex items-center gap-1.5 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "education"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GraduationCap size={14} />
            <span>Education History *</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("experience")}
            className={`flex items-center gap-1.5 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "experience"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Briefcase size={14} />
            <span>Work Experience *</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex items-center gap-1.5 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "identity"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User size={14} />
            <span>Identity & Contact</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-1.5 py-3 font-medium transition-colors border-b-2 ${
              activeTab === "preferences"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers size={14} />
            <span>Skills & Links</span>
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: EDUCATION HISTORY */}
          {activeTab === "education" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-blue-300">
                <p className="font-medium">🎓 ATS Education Verification</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Greenhouse and Lever require university credentials. Filling this now prevents checkpoint pauses across all future applications.
                </p>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1.5 font-medium">
                  Institution / College / University *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pandit Deendayal Energy University, Gandhinagar"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Degree Program *</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech Computer Science & Engineering"
                    value={formData.highestDegree}
                    onChange={(e) => setFormData({ ...formData, highestDegree: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Field of Study / Major</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science and Engineering"
                    value={formData.fieldOfStudy}
                    onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Graduation Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2028"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Status</label>
                  <div className="rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-300 flex items-center justify-between">
                    <span>Currently Enrolled / In Progress</span>
                    <CheckCircle2 size={15} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORK EXPERIENCE */}
          {activeTab === "experience" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-indigo-300">
                <p className="font-medium">💼 Candidate Work Experience</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Autofills current employment and years of experience on company career forms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Current Role / Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. SDE Intern"
                    value={formData.currentTitle}
                    onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. nopCypher"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1.5 font-medium">Total Years of Experience</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1.5 font-medium">
                  Experience Summary / Key Responsibilities
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. SDE Intern @nopCypher. Working on full-stack web applications, TypeScript backend services, and automated distributed pipelines."
                  value={formData.experienceDescription}
                  onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: IDENTITY & CONTACT */}
          {activeTab === "identity" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Contact Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS & LINKS */}
          {activeTab === "preferences" && (
            <div className="space-y-4 text-xs animate-in fade-in duration-150">
              <div>
                <label className="text-zinc-300 block mb-1.5 font-medium">
                  Technical Skills (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="TypeScript, React, Node.js, Next.js, PostgreSQL, C++"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Work Mode Preference</label>
                  <select
                    value={formData.workMode}
                    onChange={(e) => setFormData({ ...formData, workMode: e.target.value as any })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                    <option value="ONSITE">On-Site</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-medium">Notice Period (Days)</label>
                  <input
                    type="number"
                    value={formData.noticePeriodDays}
                    onChange={(e) => setFormData({ ...formData, noticePeriodDays: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#141722] p-2.5 text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons inside form */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-400">
              Details saved to permanent database vault for all loops.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving to Vault & Queueing...</span>
                ) : (
                  <>
                    <span>Save to Vault & Start Auto-Apply</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
