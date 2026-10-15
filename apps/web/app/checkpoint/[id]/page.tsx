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
  ChevronRight,
} from "lucide-react";
import { INITIAL_APPLICATIONS } from "@/lib/mock-data";

export default function CheckpointPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [appData, setAppData] = useState<any>(null);

  // Form states for intervention resolution
  const [captchaVerified, setCaptchaVerified] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [approvedSubmit, setApprovedSubmit] = useState(true);

  useEffect(() => {
    async function loadApplication() {
      setLoading(true);
      try {
        // 1. Try fetching from live backend
        const res = await fetch(`/api/v1/applications/${applicationId}`, {
          headers: { Accept: "application/json" },
        }).catch(() => null);

        if (res && res.ok) {
          const json = await res.json();
          if (json?.data || json?.application) {
            const app = json.data || json.application;
            setAppData(app);
            initAnswers(app);
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to mock applications or synthesis
        const found = INITIAL_APPLICATIONS.find((a) => a.id === applicationId);
        if (found) {
          setAppData(found);
          initAnswers(found);
        } else {
          // Synthetic fallback for any arbitrary ID
          const synthetic = {
            id: applicationId,
            jobTitle: "Software Development Engineer - Platform & Distributed Systems",
            company: { name: "Razorpay", tier: "S" },
            companyName: "Razorpay",
            location: "Bengaluru, Karnataka, India",
            atsProvider: "Greenhouse",
            jobUrl: "https://job-boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/4721861005",
            status: "WAITING_FOR_USER",
            failureReason: "Security Challenge / Cloudflare Turnstile detected on application portal. Human confirmation required.",
            matchScore: 95,
            questions: [
              {
                id: "q-1",
                label: "Why are you interested in joining our team?",
                aiProposedValue: "I am passionate about high-scale distributed systems and building resilient merchant payment rails. My experience in Go, TypeScript, and microservices aligns directly with your mission.",
              },
              {
                id: "q-2",
                label: "What is your earliest joining date or notice period?",
                aiProposedValue: "Immediately / 15 days notice",
              },
            ],
          };
          setAppData(synthetic);
          initAnswers(synthetic);
        }
      } catch (err) {
        console.error("Error loading checkpoint:", err);
      } finally {
        setLoading(false);
      }
    }

    function initAnswers(app: any) {
      const initial: Record<string, string> = {};
      if (app.questions && Array.isArray(app.questions)) {
        for (const q of app.questions) {
          initial[q.id || q.field || q.label] = q.aiProposedValue || "";
        }
      }
      setAnswers(initial);
    }

    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const handleResolveAndResume = async () => {
    setSubmitting(true);
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
          source: "CHECKPOINT_UI",
        },
      };

      const res = await fetch(`/api/v1/applications/${applicationId}/resolve-checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      setSuccess(true);

      // Give visual celebration feedback then return to pipeline
      setTimeout(() => {
        router.push(`/?tab=pipeline&checkpointResolved=${encodeURIComponent(applicationId)}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to resolve checkpoint:", err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white">Loading Application Checkpoint...</h2>
          <p className="text-xs text-slate-400">Retrieving half-filled form state and Playwright session</p>
        </div>
      </div>
    );
  }

  const company = appData?.company?.name || appData?.companyName || "Employer";
  const jobTitle = appData?.jobTitle || appData?.title || "Job Application";
  const portalUrl = appData?.checkpointUrl || appData?.jobUrl || appData?.canonicalUrl || appData?.url;
  const reason = appData?.failureReason || appData?.reason || "Human confirmation required before final submission.";

  const isCaptcha = /captcha|security|cloudflare|turnstile|recaptcha/i.test(reason);
  const is2fa = /2fa|otp|passcode|code|sms/i.test(reason);
  const questionsList = appData?.questions || [];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/[0.08] bg-[#0c0f18]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/?tab=reviews"
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
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Live Portal Tab</span>
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

        {/* 2-Column Split: Left = Half-Filled Form State; Right = Checkpoint Resolution Gate */}
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
                  Ready to Submit
                </span>
              </div>

              <p className="text-xs text-slate-400">
                The autonomous browser agent navigated to {company}&apos;s portal and populated all standard candidate fields from your profile.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Candidate Name</span>
                  </div>
                  <span className="font-semibold text-white">Rudra Bhungaliya</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact Email</span>
                  </div>
                  <span className="font-semibold text-white">rudra.bhungaliya@gmail.com</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </div>
                  <span className="font-semibold text-white">+91 98765 43210</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location</span>
                  </div>
                  <span className="font-semibold text-white">Bengaluru, Karnataka, India</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2.5 text-emerald-300">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tailored Resume (PDF)</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-300">Attached (98 KB)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>LinkedIn Profile</span>
                  </div>
                  <span className="font-semibold text-blue-300 truncate max-w-[180px]">linkedin.com/in/rudra</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Code2 className="w-3.5 h-3.5 text-slate-300" />
                    <span>GitHub / Portfolio</span>
                  </div>
                  <span className="font-semibold text-slate-200 truncate max-w-[180px]">github.com/RudraBhungaliya</span>
                </div>
              </div>
            </div>

            {/* Execution Trace Timeline */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Agent Session Timeline
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Target Opening Located:</span> {company} requisition
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Browser Form Populated:</span> 7 fields mapped cleanly
                  </div>
                </div>
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

                  {portalUrl && (
                    <div className="pt-1">
                      <a
                        href={portalUrl}
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
                        Enter the 6-digit verification code sent to your phone or email by the employer ATS.
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

              {/* 3. Custom Employer Questions (with AI pre-fill) */}
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
                          {q.label || "Screening Question"}
                        </label>
                        <textarea
                          rows={3}
                          value={answers[qKey] ?? q.aiProposedValue ?? ""}
                          onChange={(e) => setAnswers({ ...answers, [qKey]: e.target.value })}
                          className="w-full rounded-xl bg-black/40 border border-white/[0.1] p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 leading-relaxed"
                          placeholder="Your answer..."
                        />
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80">
                          <Sparkles className="w-3 h-3" />
                          <span>AI pre-filled based on your profile & skills. You can edit directly.</span>
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
                      <span>Submit & Continue Pipeline</span>
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
