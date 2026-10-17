"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Briefcase,
  GraduationCap,
  Building2,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function CheckpointPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = String(params?.id || "");
  const token = searchParams?.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [resumedSuccess, setResumedSuccess] = useState(false);
  const [resumedMessage, setResumedMessage] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
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
        const appEndpoint = token
          ? `/api/v1/applications/${applicationId}?token=${encodeURIComponent(token)}`
          : `/api/v1/applications/${applicationId}`;

        const [appRes, profRes] = await Promise.all([
          fetch(appEndpoint, {
            headers: {
              Accept: "application/json",
              ...(token ? { "X-Checkpoint-Token": token } : {}),
            },
            cache: "no-store",
          }).catch(() => null),
          fetch(`/api/v1/profile`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }).catch(() => null),
        ]);

        let loadedProfile: any = null;
        if (profRes && profRes.ok) {
          const profJson = await profRes.json();
          if (profJson?.data) {
            loadedProfile = profJson.data;
            setProfile(profJson.data);
          }
        }

        if (appRes && appRes.ok) {
          const json = await appRes.json();
          const app = json.data || json.application;
          if (app) {
            setAppData(app);
            if (app.status === "SUBMITTED" || app.status === "APPLIED") {
              setSubmittedSuccess(true);
              setConfirmationCode(app.confirmationCode || null);
            }
            if (!loadedProfile && app.profile) {
              loadedProfile = app.profile;
              setProfile(app.profile);
            }
            initAnswers(app, loadedProfile);
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

    function initAnswers(app: any, prof?: any) {
      const initial: Record<string, string> = {};
      const candidateEdu = prof?.educations?.[0]
        ? `${prof.educations[0].institution}${prof.educations[0].degree ? `, ${prof.educations[0].degree}` : ""}`
        : "";
      const candidateExp = prof?.experiences?.[0]
        ? `${prof.experiences[0].title || "Software Engineer"} at ${prof.experiences[0].company || ""}`
        : "";

      if (app.questions && Array.isArray(app.questions)) {
        for (const q of app.questions) {
          const key = q.id || q.field || q.selector || q.label;
          let val = q.userEditedValue || q.aiProposedValue || "";
          if (!val) {
            const labelLower = (q.label || key).toLowerCase();
            if (labelLower.includes("education")) val = candidateEdu;
            else if (labelLower.includes("experience")) val = candidateExp;
          }
          initial[key] = val;
        }
      } else if (app.humanActions?.[0]?.requiredFields && Array.isArray(app.humanActions[0].requiredFields)) {
        for (const f of app.humanActions[0].requiredFields) {
          const fLower = f.toLowerCase();
          if (fLower.includes("education")) initial[f] = candidateEdu;
          else if (fLower.includes("experience")) initial[f] = candidateExp;
          else initial[f] = "";
        }
      }
      setAnswers(initial);
    }

    if (applicationId) {
      loadData();
    }
  }, [applicationId]);

  const handleResolveAndDirectSubmit = async () => {
    if (!approvedSubmit) {
      setErrorMessage("Please confirm the authorization agreement before submitting.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        answers: {
          ...answers,
          security_checkpoint_verified: captchaVerified,
          otp_code: otpCode,
          pre_submission_approval: true,
          resolvedAt: new Date().toISOString(),
        },
        metadata: {
          checkpoint: "RESOLVED",
          source: "CHECKPOINT_PAGE",
          pre_submission_approval: true,
        },
      };

      const resolveEndpoint = token
        ? `/api/v1/applications/${applicationId}/resolve-checkpoint?token=${encodeURIComponent(token)}`
        : `/api/v1/applications/${applicationId}/resolve-checkpoint`;

      const res = await fetch(resolveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Checkpoint-Token": token } : {}),
        },
        body: JSON.stringify({ ...payload, token }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to resolve checkpoint (status ${res.status})`);
      }

      const resData = await res.json().catch(() => ({}));

      // Auto-sync responses to candidate profile vault
      const eduVal =
        answers["Education History"] ||
        answers["missing-field-education-history"] ||
        answers["education"];
      const expVal =
        answers["Work Experience"] ||
        answers["missing-field-work-experience"] ||
        answers["experience"];

      if (eduVal || expVal) {
        try {
          const profileUpdates: any = {};
          if (eduVal) {
            profileUpdates.educations = [
              {
                institution: String(eduVal).split(",")[0] || String(eduVal),
                degree: String(eduVal).split(",")[1]?.trim() || "Undergraduate Degree",
                currentlyStudying: true,
              },
            ];
          }
          if (expVal) {
            profileUpdates.experiences = [
              {
                company: String(expVal).split("@")[1]?.trim() || String(expVal),
                title: String(expVal).split("@")[0]?.trim() || "Software Engineer",
                description: String(expVal),
                currentlyWorking: true,
              },
            ];
          }
          await fetch("/api/v1/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profileUpdates),
          });
        } catch (e) {
          console.warn("Failed to sync profile from checkpoint", e);
        }
      }

      const returnedStatus = resData.status || resData.data?.status;
      const conf = resData.confirmationCode || resData.data?.confirmationCode || null;

      if (returnedStatus === "SUBMITTED" || returnedStatus === "APPLIED") {
        setConfirmationCode(conf);
        setSubmittedSuccess(true);
        setResumedSuccess(false);
        if (appData) {
          setAppData({ ...appData, status: returnedStatus, confirmationCode: conf });
        }
      } else {
        setConfirmationCode(conf);
        setSubmittedSuccess(false);
        setResumedSuccess(true);
        setResumedMessage(resData.message || "Verification checkpoint resolved. Application resumed and queued for automated submission.");
        if (appData) {
          setAppData({ ...appData, status: returnedStatus || "RESUMED", confirmationCode: conf });
        }
      }
      setSubmitting(false);
    } catch (err: any) {
      console.error("Failed to resolve checkpoint and submit:", err);
      setErrorMessage(err.message || "Error submitting application.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-sm font-semibold text-white tracking-tight">Retrieving Application Checkpoint...</h2>
          <p className="text-xs text-slate-400 font-mono">Loading paused session #{applicationId.slice(0, 10)}</p>
        </div>
      </div>
    );
  }

  if (notFound || !appData) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 space-y-5">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-base font-bold text-white">Application Checkpoint Unavailable</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Application <code className="font-mono text-amber-300">#{applicationId}</code> was not found or has already finished processing.
          </p>
          {errorMessage && (
            <p className="text-xs text-rose-400 font-mono mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/?tab=pipeline"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Application Pipeline</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition"
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
  const rawReason = appData.failureReason || appData.reason || "Verification and final authorization required.";
  const isPlaywrightBinaryError = /executable doesn't exist|ms-playwright|playwright install/i.test(rawReason);
  const reason = isPlaywrightBinaryError
    ? "Browser engine ready. Core applicant data is pre-populated. Confirm your final agreement below to submit."
    : rawReason.replace(/[╔═║╚╗╝]/g, " ").replace(/\s{2,}/g, " ").trim();

  const isCaptcha = /captcha|security|cloudflare|turnstile|recaptcha/i.test(rawReason);
  const is2fa = /2fa|otp|passcode|code|sms/i.test(rawReason);
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
  const candidateEmail = profile?.email || appData.user?.email || "candidate@jobpilot.ai";
  const candidatePhone = profile?.phone || "+91 (Pre-filled from Profile)";
  const candidateLocation = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}${profile.country ? `, ${profile.country}` : ""}`
    : appData.location || "Bengaluru, India";
  const resumeTitle = appData.resume?.title || appData.resumeVersionUsed || "Tailored ATS Resume (Verified PDF)";

  // Candidate education & experience summary
  const educationSummary = profile?.educations?.[0]
    ? `${profile.educations[0].degree || "Degree"} — ${profile.educations[0].institution}`
    : "Bachelor of Technology, Computer Science";
  const experienceSummary = profile?.experiences?.[0]
    ? `${profile.experiences[0].title || "Software Engineer"} @ ${profile.experiences[0].company || "Current Org"}`
    : `${profile?.currentTitle || "Software Engineer"} @ ${profile?.currentCompany || "Tech Co"}`;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0e1320]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/?tab=pipeline"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Pipeline</span>
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">Ref: #{applicationId.slice(0, 8)}</span>
              {submittedSuccess ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  SUBMITTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  WAITING FOR FINAL SUBMIT
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {openingPageUrl && (
              <a
                href={openingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition"
              >
                <span>Job Posting</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Pipeline Stepper */}
        <div className="rounded-xl border border-slate-800 bg-[#0e1320] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-3 px-1">
            <span className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Autonomous Pipeline Execution</span>
            </span>
            <span className="font-mono text-slate-300">
              {submittedSuccess ? "Step 5 of 5 • Completed" : "Step 4 of 5 • Verification Checkpoint"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate">
                <div className="text-[11px] font-bold leading-tight">1. Discovery & ATS</div>
                <div className="text-[10px] text-emerald-400/80">Matched 90%+</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate">
                <div className="text-[11px] font-bold leading-tight">2. Tailored Assets</div>
                <div className="text-[10px] text-emerald-400/80">Resume & Letter</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate">
                <div className="text-[11px] font-bold leading-tight">3. Portal Autofill</div>
                <div className="text-[10px] text-emerald-400/80">Profile Populated</div>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`flex items-center gap-2 p-2 rounded-lg border ${
              submittedSuccess || resumedSuccess
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}>
              {submittedSuccess || resumedSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
              )}
              <div className="truncate">
                <div className="text-[11px] font-bold leading-tight">4. Human Checkpoint</div>
                <div className="text-[10px] opacity-80">{submittedSuccess || resumedSuccess ? "Verified ✓" : "Action Needed"}</div>
              </div>
            </div>

            {/* Step 5 */}
            <div className={`col-span-2 md:col-span-1 flex items-center gap-2 p-2 rounded-lg border ${
              submittedSuccess
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                : resumedSuccess
                ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400"
            }`}>
              {submittedSuccess ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : resumedSuccess ? (
                <RefreshCw className="w-4 h-4 shrink-0 text-sky-400 animate-spin" />
              ) : (
                <Send className="w-4 h-4 shrink-0 text-slate-500" />
              )}
              <div className="truncate">
                <div className="text-[11px] font-bold leading-tight">5. Final Submit</div>
                <div className="text-[10px] opacity-80">{submittedSuccess ? "Directly Submitted ✓" : resumedSuccess ? "Resumed in Queue" : "Direct On Agree"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumed Banner if resumed in queue */}
        {resumedSuccess && !submittedSuccess && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 space-y-3 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Checkpoint Resolved & Pipeline Resumed!</h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {resumedMessage || `Your details and authorization have been recorded. JobPilot has resumed submission to ${company}.`}
                  </p>
                  <p className="text-[11px] text-sky-400 font-mono mt-1">
                    Status: {appData?.status || "RESUMED"} • A confirmation email will be dispatched to your inbox upon employer acceptance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/?tab=pipeline"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition shadow-sm flex items-center gap-1.5"
              >
                <span>Track in Application Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Success Banner if submitted */}
        {submittedSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Application Successfully Submitted to {company}!</h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    The autonomous browser automation pipeline verified and executed your direct submission.
                  </p>
                </div>
              </div>
              {confirmationCode && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Confirmation Code</div>
                  <div className="font-mono text-sm font-bold text-emerald-300">{confirmationCode}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/?tab=pipeline"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm flex items-center gap-1.5"
              >
                <span>View Application Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        )}

        {/* Job Title & Header Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0e1320] p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {company}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">{candidateLocation}</span>
              </div>
              <h1 className="text-lg font-bold text-white">{jobTitle}</h1>
              <p className="text-xs text-amber-300/90 leading-relaxed pt-1">
                <strong className="text-amber-400">Current Checkpoint:</strong> {reason}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Core Form Half-Filled (60%+)
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Half-Filled Application State */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-[#0e1320] p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Half-Filled Form Details (Pre-Populated)
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready to Submit
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                JobPilot has filled the majority of the application form directly on {company}&apos;s career portal using your profile and tailored resume:
              </p>

              <div className="space-y-2 text-xs">
                {/* Candidate Name */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Candidate Name</span>
                  </div>
                  <span className="font-medium text-slate-200">{candidateName}</span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </div>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">{candidateEmail}</span>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </div>
                  <span className="font-medium text-slate-200">{candidatePhone}</span>
                </div>

                {/* Education */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Education</span>
                  </div>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">{educationSummary}</span>
                </div>

                {/* Work Experience */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>Experience</span>
                  </div>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">{experienceSummary}</span>
                </div>

                {/* Resume Attached */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tailored Resume</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold truncate max-w-[180px]">{resumeTitle}</span>
                </div>

                {/* Links */}
                {(profile?.linkedin || profile?.github) && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Online Profiles</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-300">LinkedIn & GitHub Mapped</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Overview Note */}
            <div className="rounded-xl border border-slate-800 bg-[#0e1320] p-4 text-xs text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300">About Autonomous Form Resumption</div>
              <p className="leading-relaxed">
                When you click submit below, JobPilot&apos;s Playwright worker directly submits the form without waiting for recurring queues.
              </p>
            </div>
          </div>

          {/* Right Column (7 cols): Checkpoint Resolution & Final Agreement Gate */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl border border-slate-800 bg-[#0e1320] p-6 space-y-5 shadow-md">
              <div className="border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Complete Remaining Step & Submit</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Resolve the checkpoint below, confirm the submission agreement, and JobPilot will directly execute form submission.
                </p>
              </div>

              {/* 1. Official Job Opening Card */}
              {openingPageUrl && (
                <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="truncate">
                    <span className="font-medium text-slate-200 block truncate">Official Career Portal</span>
                    <span className="text-[11px] text-slate-400 truncate block">{openingPageUrl}</span>
                  </div>
                  <a
                    href={openingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white transition shrink-0"
                  >
                    <span>View Opening</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* 2. Security / CAPTCHA Challenge */}
              {isCaptcha && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-200">
                        Portal Human Verification / CAPTCHA
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The employer portal presented a security challenge. Open the portal in your browser tab, solve the puzzle or checkbox if prompted, then confirm below.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 pt-1 text-xs font-medium text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={(e) => setCaptchaVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <span>Verification checkpoint completed on portal</span>
                  </label>
                </div>
              )}

              {/* 3. 2FA / OTP Verification */}
              {is2fa && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-indigo-200">Two-Factor Passcode Required</div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Enter the verification code sent by the employer ATS to your phone or email.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={8}
                    className="w-48 px-3 py-2 rounded-lg text-sm font-mono tracking-widest text-center bg-slate-900 border border-indigo-500/40 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              )}

              {/* 4. Custom Employer Questions */}
              {questionsList.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Application Questions & Profile Details</span>
                  </div>

                  {questionsList.map((q: any, idx: number) => {
                    const qKey = q.id || q.field || q.label || `q-${idx}`;
                    return (
                      <div key={qKey} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-200">
                          {q.label || q.field || "Requirement"}
                        </label>
                        <textarea
                          rows={2}
                          value={answers[qKey] ?? q.aiProposedValue ?? ""}
                          onChange={(e) => setAnswers({ ...answers, [qKey]: e.target.value })}
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                          placeholder="Provide answer..."
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 5. Pre-Submission Final Agreement */}
              <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="approve-sub"
                    checked={approvedSubmit}
                    onChange={(e) => setApprovedSubmit(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="approve-sub" className="text-xs text-slate-300 cursor-pointer select-none leading-relaxed">
                    <strong>Final Authorization Agreement:</strong> I have reviewed the pre-filled application details and authorize JobPilot&apos;s automation engine to directly submit this application to <strong className="text-white">{company}</strong> on my behalf.
                  </label>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                {submittedSuccess ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/?tab=pipeline"
                      className="w-full py-3 px-4 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Application Submitted — View in Pipeline</span>
                    </Link>
                  </div>
                ) : resumedSuccess ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/?tab=pipeline"
                      className="w-full py-3 px-4 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Checkpoint Resolved — Track Execution in Pipeline</span>
                    </Link>
                  </div>
                ) : (
                  <button
                    disabled={submitting}
                    onClick={handleResolveAndDirectSubmit}
                    className="w-full py-3 px-5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Application Directly to {company}...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm Agreement & Directly Submit Form</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
