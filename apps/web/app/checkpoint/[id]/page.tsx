"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Key,
  AlertTriangle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Code2,
  Check,
  Send,
  HelpCircle,
  Clock,
} from "lucide-react";

export default function CheckpointPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appData, setAppData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Form states for intervention resolution
  const [captchaVerified, setCaptchaVerified] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [approvedSubmit, setApprovedSubmit] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setNotFound(false);
      setErrorMessage(null);

      try {
        // Fetch application and candidate profile in parallel from real PostgreSQL backend
        const [appRes, profRes] = await Promise.all([
          fetch(`/api/v1/applications/${applicationId}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }).catch(() => null),
          fetch(`/api/v1/profile`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }).catch(() => null),
        ]);

        if (profRes && profRes.ok) {
          const profJson = await profRes.json();
          if (profJson?.data) {
            setProfile(profJson.data);
          }
        }

        if (appRes && appRes.ok) {
          const json = await appRes.json();
          const app = json.data || json.application;
          if (app) {
            setAppData(app);
            initAnswers(app);
            setLoading(false);
            return;
          }
        }

        setNotFound(true);
      } catch (err: any) {
        console.error("Error loading checkpoint:", err);
        setErrorMessage(err.message || "Failed to load checkpoint data");
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    function initAnswers(app: any) {
      const initial: Record<string, string> = {};
      if (app.questions && Array.isArray(app.questions)) {
        for (const q of app.questions) {
          const key = q.id || q.field || q.selector || q.label;
          initial[key] = q.userEditedValue || q.aiProposedValue || "";
        }
      } else if (app.humanActions?.[0]?.requiredFields && Array.isArray(app.humanActions[0].requiredFields)) {
        for (const f of app.humanActions[0].requiredFields) {
          initial[f] = "";
        }
      }
      setAnswers(initial);
    }

    if (applicationId) {
      loadData();
    }
  }, [applicationId]);

  const handleResolveAndResume = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        answers: {
          ...answers,
          security_checkpoint_verified: captchaVerified,
          otp_code: otpCode,
          pre_submission_approval: approvedSubmit,
          resolvedAt: new Date().toISOString(),
        },
        metadata: {
          checkpoint: "RESOLVED",
          source: "CHECKPOINT_PAGE",
        },
      };

      const res = await fetch(`/api/v1/applications/${applicationId}/resolve-checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to resolve checkpoint (status ${res.status})`);
      }

      setSuccess(true);

      // Return user to pipeline tracking tab after clearing checkpoint
      setTimeout(() => {
        router.push(`/?tab=pipeline&checkpointResolved=${encodeURIComponent(applicationId)}`);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to resolve checkpoint:", err);
      setErrorMessage(err.message || "Error resuming automation.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white">Loading Application Checkpoint...</h2>
          <p className="text-xs text-slate-400 font-mono">Retrieving active session for #{applicationId.slice(0, 12)}</p>
        </div>
      </div>
    );
  }

  if (notFound || !appData) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-6 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-lg font-bold text-white">Application Checkpoint Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Application <code className="font-mono text-amber-300">#{applicationId}</code> was not found in the active database.
            It may have already been resolved, submitted, or cancelled.
          </p>
          {errorMessage && (
            <p className="text-xs text-rose-400 font-mono mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/?tab=interventions"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Interventions Hub</span>
          </Link>
          <Link
            href="/?tab=dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition"
          >
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const company = appData.company?.name || appData.companyName || "Employer";
  const jobTitle = appData.jobTitle || appData.title || "Job Application";
  const openingPageUrl = appData.jobUrl || appData.checkpointUrl || appData.canonicalUrl || appData.url;
  const reason = appData.failureReason || appData.reason || "Human confirmation required before final submission.";

  const isCaptcha = /captcha|security|cloudflare|turnstile|recaptcha/i.test(reason);
  const is2fa = /2fa|otp|passcode|code|sms/i.test(reason);
  const questionsList = appData.questions && appData.questions.length > 0
    ? appData.questions
    : (appData.humanActions?.[0]?.requiredFields || []).map((f: string) => ({
        id: f,
        label: f,
        field: f,
        aiProposedValue: "",
      }));

  const candidateName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : "Candidate";
  const candidateEmail = profile?.email || "candidate@jobpilot.ai";
  const candidatePhone = profile?.phone || "Pre-filled from profile";
  const candidateLocation = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}${profile.country ? `, ${profile.country}` : ""}`
    : appData.location || "Bengaluru, India";
  const resumeTitle = appData.resumeVersionUsed || (profile?.skills?.length ? `${profile.skills.length} Extracted Skills Attached` : "Tailored ATS Resume Attached (PDF)");

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#0c0f18]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/?tab=interventions"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Interventions</span>
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">App #{applicationId.slice(0, 8)}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PAUSED - ACTION REQUIRED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {openingPageUrl && (
              <a
                href={openingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Official Opening Page ↗</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Alert */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#121624] to-[#0c0f18] p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{jobTitle}</h1>
                  <span className="text-xs text-slate-400">at</span>
                  <span className="text-xs font-bold text-amber-300">{company}</span>
                </div>
                <div className="text-xs text-amber-200/90 leading-relaxed max-w-3xl">
                  <strong>Intervention Blockage:</strong> {reason}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                85% Autofilled
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Left = Pre-Filled Form State; Right = Checkpoint Resolution Gate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Half-Filled Application State */}
          <div className="lg:col-span-5 space-y-5">
            {/* Autofilled Fields Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Autofilled by Playwright Agent</h2>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Data Preserved
                </span>
              </div>

              <p className="text-xs text-slate-400">
                The autonomous browser agent navigated to {company}&apos;s portal and populated standard candidate fields from your profile.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Candidate Name</span>
                  </div>
                  <span className="font-semibold text-white">{candidateName}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Email</span>
                  </div>
                  <span className="font-semibold text-white">{candidateEmail}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </div>
                  <span className="font-semibold text-white">{candidatePhone}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location</span>
                  </div>
                  <span className="font-semibold text-white">{candidateLocation}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2.5 text-emerald-300">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tailored Resume</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-300">{resumeTitle}</span>
                </div>

                {profile?.linkedin && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn Profile</span>
                    </div>
                    <span className="font-semibold text-blue-300 truncate max-w-[180px]">{profile.linkedin}</span>
                  </div>
                )}

                {profile?.github && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Code2 className="w-3.5 h-3.5 text-slate-300" />
                      <span>GitHub</span>
                    </div>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]">{profile.github}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Execution Trace Timeline */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Agent Session Logs
              </h3>
              <div className="space-y-3 text-xs">
                {appData.telemetryLogs && appData.telemetryLogs.length > 0 ? (
                  appData.telemetryLogs.slice(0, 5).map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">{log.step}:</span> {log.detail}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-2.5 text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">Target Opening Located:</span> {company} career portal
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">Browser Form Populated:</span> Core applicant fields mapped
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-start gap-2.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-200">Execution Paused:</span> Awaiting your checkpoint sign-off below
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Interactive Intervention Gate */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl border border-amber-500/25 bg-[#0f121d] p-6 space-y-5 shadow-xl">
              <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Checkpoint Resolution Gate</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide the missing verification details or sign off. Submitting will unpause the Playwright agent to finalize submission.
                  </p>
                </div>
              </div>

              {/* Direct Link to Job Opening */}
              {openingPageUrl && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-sky-200 block">Employer Job Opening Page</span>
                    <span className="text-[11px] text-slate-300 truncate block max-w-sm">{openingPageUrl}</span>
                  </div>
                  <a
                    href={openingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shrink-0 transition"
                  >
                    <span>View Opening</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* 1. Security / CAPTCHA Challenge */}
              {isCaptcha && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-200">
                        Solve Anti-Bot / CAPTCHA Challenge on Portal
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The employer uses Cloudflare Turnstile or reCAPTCHA. Click below to open the portal tab in your browser, complete the puzzle or checkbox, then confirm below.
                      </p>
                    </div>
                  </div>

                  {openingPageUrl && (
                    <div className="pt-1">
                      <a
                        href={openingPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Portal in New Tab & Solve CAPTCHA</span>
                      </a>
                    </div>
                  )}

                  <label className="flex items-center gap-2.5 pt-2 text-xs font-semibold text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={(e) => setCaptchaVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-amber-500/40 cursor-pointer"
                    />
                    <span>I have solved the verification checkpoint / CAPTCHA on the portal</span>
                  </label>
                </div>
              )}

              {/* 2. 2FA / OTP Verification */}
              {is2fa && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-blue-200">Two-Factor Authentication Passcode</div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Enter the verification code sent to your phone or email by the employer ATS.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="e.g. 849201"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={8}
                      className="w-48 px-3 py-2 rounded-xl text-sm font-mono tracking-widest text-center bg-black/50 border border-blue-500/40 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* 3. Custom Employer Questions */}
              {questionsList.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Employer Custom Questions</span>
                  </div>

                  {questionsList.map((q: any, idx: number) => {
                    const qKey = q.id || q.field || q.label || `q-${idx}`;
                    return (
                      <div key={qKey} className="rounded-xl border border-white/[0.08] bg-[#121624] p-4 space-y-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          {q.label || q.field || "Screening Question"}
                        </label>
                        <textarea
                          rows={3}
                          value={answers[qKey] ?? q.aiProposedValue ?? ""}
                          onChange={(e) => setAnswers({ ...answers, [qKey]: e.target.value })}
                          className="w-full rounded-xl bg-black/40 border border-white/[0.1] p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 leading-relaxed"
                          placeholder="Provide answer for this requirement..."
                        />
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80">
                          <Sparkles className="w-3 h-3" />
                          <span>Submitted directly to Playwright pipeline upon resumption.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Pre-submission Approval Checkbox */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                <input
                  type="checkbox"
                  id="approve-sub"
                  checked={approvedSubmit}
                  onChange={(e) => setApprovedSubmit(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-white/[0.2] cursor-pointer"
                />
                <label htmlFor="approve-sub" className="text-xs text-slate-300 cursor-pointer select-none">
                  Authorize JobPilot to resume and finalize application submission to <strong className="text-white">{company}</strong>.
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* Submit / Resume Button */}
              <div className="pt-2">
                <button
                  disabled={submitting || success}
                  onClick={handleResolveAndResume}
                  className={`w-full py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer ${
                    success
                      ? "bg-emerald-500 text-white"
                      : "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/25"
                  } disabled:opacity-50`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resolving Checkpoint & Resuming Pipeline...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Checkpoint Resolved! Pipeline Resumed...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Details & Continue Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
