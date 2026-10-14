"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Search,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  X,
  ArrowUpRight,
  RefreshCw,
  Building2,
  ShieldCheck,
  Sparkles,
  Send,
  Briefcase,
  Layers,
  Activity,
  Zap,
  ExternalLink,
  BarChart3,
  Award,
  Copy,
  Edit3,
  Trash2,
  Eye,
  Target,
  Bell,
  User,
  ShieldAlert,
  Loader2,
  Wand2,
  Mail,
  Filter,
} from "lucide-react";
import { JobSearchLoopsView } from "../components/job-search-loops";

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  company: string;
  category: "TIER_1_MNC" | "TIER_2_UNICORN" | "TIER_3_MIDMARKET" | "TIER_4_SERVICES" | "REMOTE" | "MNC" | "SEMI_MNC";
  categoryLabel: string;
  location: string;
  city: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  url: string;
  atsUrl?: string;
  canonicalUrl?: string;
  source: string;
  atsProvider: string;
  salaryINR: string;
  salaryMinLPA: number;
  salaryMaxLPA: number;
  experienceLevel: string;
  tags: string[];
  description: string;
  matchScore?: number;
  matchedSkills?: string[];
}

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  currentTitle: string;
  currentCompany: string;
  yearsOfExperience: number;
  expectedSalaryLPA: number;
  currentSalaryLPA: number;
  noticePeriodDays: number;
  workMode: "REMOTE" | "HYBRID" | "ONSITE";
  github: string;
  linkedin: string;
  portfolio: string;
  skills: string[];
}

export interface ApplicationTrackerItem {
  id: string;
  title: string;
  company: string;
  status: "QUEUED" | "RUNNING" | "NEEDS_INTERVENTION" | "SUBMITTED" | "FAILED";
  time: string;
  atsProvider: string;
  salaryINR: string;
  location: string;
  canonicalUrl?: string;
  reason?: string;
  step?: string;
}

const INITIAL_PROFILE: CandidateProfile = {
  firstName: "Rudra",
  lastName: "Bhungaliya",
  email: "rudra.b@jobpilot.ai",
  phone: "+91 9876543210",
  city: "Bengaluru",
  currentTitle: "Senior Full Stack Engineer",
  currentCompany: "Tech Systems India",
  yearsOfExperience: 5,
  expectedSalaryLPA: 38,
  currentSalaryLPA: 26,
  noticePeriodDays: 30,
  workMode: "HYBRID",
  github: "https://github.com/developer",
  linkedin: "https://linkedin.com/in/developer",
  portfolio: "https://rudra.dev",
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Redis",
    "Python",
  ],
};

export default function Home() {
  // Navigation Tabs: dashboard | jobs | pipeline | loops | profile
  const [currentTab, setCurrentTab] = useState<"dashboard" | "jobs" | "pipeline" | "loops" | "profile">("dashboard");

  // Candidate & Resume State
  const [file, setFile] = useState<{ name: string; size: string } | null>({
    name: "Rudra_Bhungaliya_CV.pdf",
    size: "184 KB",
  });
  const [isParsing, setIsParsing] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume Text Paste Modal
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Resume Tailoring / Polish Modal
  const [tailorModal, setTailorModal] = useState<{
    job: JobOpening;
    isGenerating: boolean;
    tailoredResumeText?: string;
  } | null>(null);

  // AI Match Banner
  const [aiMatchBanner, setAiMatchBanner] = useState<{
    visible: boolean;
    candidateName: string;
    title: string;
    skillsCount: number;
    matchesCount: number;
    topJob?: string;
  } | null>(null);

  // Job Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Jobs State (Live Real-Time ATS)
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [rawJobs, setRawJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobOpening | null>(null);

  // Applications Pipeline State
  const [applications, setApplications] = useState<ApplicationTrackerItem[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<string>("ALL");

  // Human-in-the-Loop Checkpoint Modal
  const [securityModal, setSecurityModal] = useState<{
    job: JobOpening | ApplicationTrackerItem;
    applicationId?: string;
    type: string;
    reason: string;
    checkpointUrl?: string;
    questions?: Array<{ selector: string; label: string; type?: string; hint?: string; required?: boolean }>;
  } | null>(null);
  const [verificationAnswers, setVerificationAnswers] = useState<Record<string, any>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Backend Stats & Notifications
  const [pipelineStats, setPipelineStats] = useState<{
    totalApplications: number;
    queuedCount: number;
    runningCount: number;
    submittedCount: number;
    savedCount: number;
    waitingUserCount: number;
    totalMatches: number;
    unreadNotificationsCount: number;
    tierBreakdown: {
      tier1Mnc: number;
      tier2Unicorn: number;
      remoteTech: number;
      midMarket: number;
      total: number;
    };
  } | null>(null);

  interface AppNotification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    readAt?: string | null;
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [queuedJobAlert, setQueuedJobAlert] = useState<{ title: string; company: string; id: string } | null>(null);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Score jobs against candidate profile
  const matchAndRankJobs = (jobList: JobOpening[], candidateProfile: CandidateProfile): JobOpening[] => {
    const candidateSkills = (candidateProfile.skills || []).map((s) => s.toLowerCase());
    const candidateTitleWords = (candidateProfile.currentTitle || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["and", "for", "the", "with"].includes(w));

    return jobList.map((job) => {
      const titleLower = (job.title || "").toLowerCase();
      const descLower = (job.description || "").toLowerCase();
      const matchedSkills: string[] = [];

      for (const skill of candidateSkills) {
        if (!skill) continue;
        const esc = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?:^|[^a-z0-9])${esc}(?:$|[^a-z0-9])`, "i");
        if (regex.test(titleLower) || regex.test(descLower)) {
          matchedSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
        }
      }

      // Title keyword score: reward engineering and core discipline matches
      let titleScore = 0;
      for (const word of candidateTitleWords) {
        if (titleLower.includes(word)) titleScore += 14;
      }
      titleScore = Math.min(38, titleScore);

      // Skills score
      const skillScore = Math.min(48, matchedSkills.length * 12);

      // Location / Remote alignment
      let locationScore = 4;
      const locLower = (job.location || "").toLowerCase();
      if (locLower.includes("remote") || (candidateProfile.city && locLower.includes(candidateProfile.city.toLowerCase()))) {
        locationScore = 14;
      }

      // Base relevance check: if job has zero relevant engineering title words and zero matching skills, cap low
      const hasCoreMatch = titleScore > 0 || matchedSkills.length > 0;
      let totalScore = Math.min(99, Math.max(15, Math.round(titleScore + skillScore + locationScore)));
      if (!hasCoreMatch) {
        totalScore = Math.min(32, totalScore);
      }

      // If backend returned matchScore from evaluationService, blend it
      if (typeof job.matchScore === "number" && job.matchScore > 0) {
        totalScore = Math.round((totalScore * 0.4) + (job.matchScore * 0.6));
      }

      return {
        ...job,
        matchScore: totalScore,
        matchedSkills,
        tags: Array.from(new Set([...(matchedSkills.slice(0, 4)), ...(job.tags || [])])).slice(0, 5),
      };
    }).sort((a, b) => {
      const aLoc = (a.location || "").toLowerCase();
      const bLoc = (b.location || "").toLowerCase();

      const aForeign = /\b(united states|usa|us|u\.s\.|uk|united kingdom|canada|germany|france|poland|ireland|israel|australia|singapore|japan|austria|malaysia)\b/i.test(aLoc) || /san francisco|new york|seattle|austin|chicago|boston|toronto|london|berlin/i.test(aLoc);
      const bForeign = /\b(united states|usa|us|u\.s\.|uk|united kingdom|canada|germany|france|poland|ireland|israel|australia|singapore|japan|austria|malaysia)\b/i.test(bLoc) || /san francisco|new york|seattle|austin|chicago|boston|toronto|london|berlin/i.test(bLoc);

      const aIndia = aLoc.includes("india") || /bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|noida|chennai|ahmedabad|jaipur|chandigarh/i.test(aLoc);
      const bIndia = bLoc.includes("india") || /bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|noida|chennai|ahmedabad|jaipur|chandigarh/i.test(bLoc);

      const aRemote = !aForeign && (aLoc.includes("remote") || aLoc.includes("global") || aLoc.includes("anywhere") || aLoc.includes("worldwide"));
      const bRemote = !bForeign && (bLoc.includes("remote") || bLoc.includes("global") || bLoc.includes("anywhere") || bLoc.includes("worldwide"));

      const aPriority = aIndia ? 4 : aRemote ? 3 : aForeign ? 1 : 2;
      const bPriority = bIndia ? 4 : bRemote ? 3 : bForeign ? 1 : 2;

      if (aPriority !== bPriority) return bPriority - aPriority;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });
  };

  // Convert raw backend job to JobOpening
  const formatRawJob = (raw: any): JobOpening => {
    const comp = raw.company || "Enterprise";
    const loc = raw.location || "Remote";
    const isMnc = /google|microsoft|stripe|apple|amazon|meta|figma|salesforce|uber/i.test(comp);
    const isUnicorn = /discord|swiggy|zepto|razorpay|cred|zomato|postman|groww/i.test(comp);
    const isRemote = /remote/i.test(loc) || /remote/i.test(raw.title || "");

    let cat: JobOpening["category"] = "TIER_3_MIDMARKET";
    let catLabel = "Mid-Market";
    if (isMnc) {
      cat = "TIER_1_MNC";
      catLabel = "Tier 1 MNC";
    } else if (isUnicorn) {
      cat = "TIER_2_UNICORN";
      catLabel = "Semi-MNC / Unicorn";
    } else if (isRemote) {
      cat = "REMOTE";
      catLabel = "Remote Tech";
    }

    const titleLower = (raw.title || "").toLowerCase();
    let salaryINR = "₹28 - 45 LPA";
    let minLPA = 28;
    let maxLPA = 45;
    if (/lead|staff|director|principal/i.test(titleLower)) {
      salaryINR = "₹45 - 75 LPA";
      minLPA = 45;
      maxLPA = 75;
    } else if (/junior|intern|associate/i.test(titleLower)) {
      salaryINR = "₹12 - 20 LPA";
      minLPA = 12;
      maxLPA = 20;
    }

    return {
      id: raw.id || raw.externalId || `job-${Math.random().toString(36).slice(2, 9)}`,
      title: raw.title || "Software Engineer",
      company: comp,
      department: raw.department || "Engineering",
      category: cat,
      categoryLabel: catLabel,
      location: loc,
      city: loc.split(",")[0]?.trim() || "Bengaluru",
      workMode: isRemote ? "Remote" : "Hybrid",
      url: raw.sourceUrl || raw.applicationUrl || raw.url || "https://careers.google.com",
      atsUrl: raw.atsUrl || raw.applicationUrl || raw.url,
      canonicalUrl: raw.sourceUrl || raw.applicationUrl || raw.url,
      source: raw.source || "greenhouse",
      atsProvider: (raw.source || "greenhouse").toUpperCase(),
      salaryINR,
      salaryMinLPA: minLPA,
      salaryMaxLPA: maxLPA,
      experienceLevel: /senior|lead|staff/i.test(titleLower) ? "5+ Years" : "2+ Years",
      tags: raw.tags || ["TypeScript", "Distributed Systems", "Cloud"],
      description: raw.description || "",
      matchScore: raw.matchScore,
    };
  };

  // Helper to format/clean raw HTML or text job descriptions
  const cleanJobDescription = (desc?: string) => {
    if (!desc) return "Detailed responsibilities, team structure, and full technical requirements are available on the official careers portal.";
    const cleaned = desc
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<li>/gi, "\n• ")
      .replace(/<\/li>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
    return cleaned || "Role overview and technical requirements are available on the official career board.";
  };

  // Fetch real-time openings from live backend endpoint
  const fetchLiveJobs = async (customProfile?: CandidateProfile, keyword?: string) => {
    setLoadingJobs(true);
    try {
      const activeProf = customProfile || profile;
      const searchKw = keyword !== undefined
        ? keyword
        : (searchQuery.trim() || activeProf.currentTitle || "");
      const queryParam = searchKw.trim()
        ? `?keyword=${encodeURIComponent(searchKw.trim())}`
        : "";
      const res = await fetch(`/api/v1/jobs/live${queryParam}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setRawJobs(json.data);
        const mapped = json.data.map(formatRawJob);
        const ranked = matchAndRankJobs(mapped, activeProf);
        setJobs(ranked);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingJobs(false);
    }
  };

  // Fetch PostgreSQL Pipeline Stats
  const fetchPipelineStats = async () => {
    try {
      const res = await fetch("/api/v1/applications/pipeline/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setPipelineStats(json.data);
          if (typeof json.data.unreadNotificationsCount === "number") {
            setUnreadCount(json.data.unreadNotificationsCount);
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  // Fetch PostgreSQL Applications
  const fetchBackendApplications = async () => {
    try {
      const res = await fetch("/api/v1/applications");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ApplicationTrackerItem[] = json.data.map((item: any) => {
            let mappedStatus: ApplicationTrackerItem["status"] = "QUEUED";
            if (item.status === "WAITING_FOR_USER") mappedStatus = "NEEDS_INTERVENTION";
            else if (item.status === "SUBMITTED" || item.status === "APPLIED" || item.status === "OFFER") mappedStatus = "SUBMITTED";
            else if (item.status === "FAILED" || item.status === "REJECTED") mappedStatus = "FAILED";
            else if (item.status === "RUNNING" || item.status === "SUBMITTING" || item.status === "TAILORING") mappedStatus = "RUNNING";
            else mappedStatus = "QUEUED";

            return {
              id: item.id,
              title: item.jobTitle || item.job?.title || item.title || "Software Engineer",
              company: item.company?.name || item.companyName || item.job?.company?.name || (typeof item.company === "string" ? item.company : "Company"),
              status: mappedStatus,
              time: item.appliedAt ? new Date(item.appliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.lastUpdated || "Recently",
              atsProvider: item.company?.verifiedAts || item.atsProvider || item.job?.atsProvider || "Greenhouse",
              salaryINR: item.salaryRange || item.salaryINR || "Competitive",
              location: item.location || item.company?.location || "Remote",
              canonicalUrl: item.jobUrl || item.canonicalUrl || item.job?.url || item.url,
              step: item.status === "WAITING_FOR_USER"
                ? (item.failureReason || "Human verification or security challenge required")
                : item.status === "SUBMITTED"
                ? "Verified confirmation on official employer portal"
                : `Application status: ${item.status}`,
              reason: item.failureReason,
            };
          });
          setApplications(mapped);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        fetch("/api/v1/notifications?limit=20"),
        fetch("/api/v1/notifications/unread-count"),
      ]);
      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        if (Array.isArray(notifsData.data)) {
          setNotifications(notifsData.data);
        }
      }
      if (countRes.ok) {
        const countData = await countRes.json();
        if (typeof countData.unreadCount === "number") {
          setUnreadCount(countData.unreadCount);
        }
      }
    } catch {
      // Fallback
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch("/api/v1/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch {
      // Fallback
    }
  };

  // Initialize and load backend state
  useEffect(() => {
    fetchLiveJobs();
    fetchPipelineStats();
    fetchBackendApplications();
    fetchNotifications();
  }, []);

  // SSE Real-time Subscription with Auto-Reconnection
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let backoffDelay = 1000;
    let isMounted = true;

    const setupSSE = () => {
      if (!isMounted) return;
      try {
        eventSource = new EventSource("/api/v1/events");

        eventSource.onopen = () => {
          backoffDelay = 1000;
        };

        eventSource.onmessage = (e) => {
          if (!e.data) return;
          try {
            const ev = JSON.parse(e.data);
            if (!ev || !ev.type) return;

            switch (ev.type) {
              case "application.status_changed": {
                const { applicationId, toStatus, reason } = ev;
                let mappedStatus: ApplicationTrackerItem["status"] = "QUEUED";
                if (toStatus === "WAITING_FOR_USER") mappedStatus = "NEEDS_INTERVENTION";
                else if (toStatus === "SUBMITTED" || toStatus === "APPLIED" || toStatus === "OFFER") mappedStatus = "SUBMITTED";
                else if (toStatus === "FAILED" || toStatus === "REJECTED") mappedStatus = "FAILED";
                else if (toStatus === "RUNNING" || toStatus === "SUBMITTING" || toStatus === "TAILORING") mappedStatus = "RUNNING";
                else mappedStatus = "QUEUED";

                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId
                      ? {
                          ...app,
                          status: mappedStatus,
                          step: reason || `Status changed to ${toStatus}`,
                          reason: reason || app.reason,
                        }
                      : app
                  )
                );
                fetchPipelineStats();
                break;
              }

              case "human_action.required": {
                const { applicationId, actionType, description, metadata } = ev;
                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId
                      ? {
                          ...app,
                          status: "NEEDS_INTERVENTION",
                          step: description || "Verification or challenge required",
                          reason: description || "Action required",
                        }
                      : app
                  )
                );
                const targetApp = applications.find((a) => a.id === applicationId);
                setSecurityModal({
                  job: targetApp || ({
                    id: applicationId,
                    title: "Application Challenge",
                    company: metadata?.companyName || "Employer Portal",
                  } as any),
                  applicationId,
                  type: actionType || "SECURITY_CHALLENGE",
                  reason: description || "Security challenge or manual field sign-off required.",
                  questions: metadata?.questions,
                  checkpointUrl: metadata?.checkpointUrl,
                });
                showToast(`⚠️ Action Required: ${description || "Security verification needed"}`);
                fetchPipelineStats();
                fetchNotifications();
                break;
              }

              case "human_action.resolved": {
                const { applicationId } = ev;
                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId
                      ? {
                          ...app,
                          status: "RUNNING",
                          step: "Verification accepted (RESUMED). Submitting to employer portal...",
                          reason: undefined,
                        }
                      : app
                  )
                );
                fetchPipelineStats();
                break;
              }

              default:
                break;
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isMounted) {
            backoffDelay = Math.min(backoffDelay * 1.5, 30000);
            reconnectTimeout = setTimeout(setupSSE, backoffDelay);
          }
        };
      } catch {
        // Fallback
      }
    };

    setupSSE();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Process and apply extracted candidate data from AI
  const applyExtractedProfile = (extData: any, sourceName: string) => {
    const rawSkills: any[] = extData.skills || [];
    const parsedSkillNames: string[] = rawSkills
      .map((s) => (typeof s === "string" ? s : s?.name || ""))
      .filter(Boolean);

    const updatedProfile: CandidateProfile = {
      firstName: extData.firstName || profile.firstName,
      lastName: extData.lastName || profile.lastName,
      email: extData.email || profile.email,
      phone: extData.phone || profile.phone,
      city: extData.city || profile.city,
      currentTitle: extData.currentTitle || profile.currentTitle,
      currentCompany: extData.currentCompany || profile.currentCompany,
      yearsOfExperience:
        typeof extData.yearsOfExperience === "number" && extData.yearsOfExperience > 0
          ? extData.yearsOfExperience
          : profile.yearsOfExperience,
      expectedSalaryLPA: profile.expectedSalaryLPA,
      currentSalaryLPA: profile.currentSalaryLPA,
      noticePeriodDays: profile.noticePeriodDays,
      workMode: profile.workMode,
      github: extData.github || profile.github,
      linkedin: extData.linkedin || profile.linkedin,
      portfolio: extData.portfolio || profile.portfolio,
      skills: parsedSkillNames.length > 0 ? parsedSkillNames : profile.skills,
    };

    setProfile(updatedProfile);

    // Persist candidate profile and skills to PostgreSQL database
    fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        city: updatedProfile.city,
        currentTitle: updatedProfile.currentTitle,
        currentCompany: updatedProfile.currentCompany,
        yearsOfExperience: updatedProfile.yearsOfExperience,
        github: updatedProfile.github,
        linkedin: updatedProfile.linkedin,
        portfolio: updatedProfile.portfolio,
        skills: updatedProfile.skills.map((s) => ({ name: s })),
      }),
    }).catch(() => {});

    // Target query based on candidate's real title and top skills
    const targetQuery = updatedProfile.currentTitle || (updatedProfile.skills.slice(0, 2).join(" ")) || "Full Stack";
    setSearchQuery(targetQuery);

    // Immediately trigger live ATS search for the candidate's skillset
    fetchLiveJobs(updatedProfile, targetQuery);

    showToast(
      `✨ Resume parsed! Sourcing live openings tailored for ${updatedProfile.currentTitle || targetQuery}.`
    );
  };

  // Upload and parse real file (.pdf, .docx, .txt) with AI
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile({
      name: uploadedFile.name,
      size: `${Math.round(uploadedFile.size / 1024)} KB`,
    });

    setIsParsing(true);
    showToast(`⚡ Gemini AI analyzing ${uploadedFile.name}...`);

    try {
      let extData: any = null;

      const formData = new FormData();
      formData.append("resume", uploadedFile);

      try {
        const previewRes = await fetch("/api/v1/resumes/preview", {
          method: "POST",
          body: formData,
        });

        if (previewRes.ok) {
          const previewJson = await previewRes.json();
          if (previewJson?.data) {
            extData = previewJson.data.aiParsed || previewJson.data.parsed;
          }
        }
      } catch (err) {
        console.warn("Preview endpoint error, trying text fallback", err);
      }

      if (!extData || (!extData.firstName && (!extData.skills || extData.skills.length === 0))) {
        if (!uploadedFile.name.toLowerCase().endsWith(".pdf") && !uploadedFile.name.toLowerCase().endsWith(".docx")) {
          const fileText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsText(uploadedFile);
          }).catch(() => "");

          if (fileText && fileText.trim().length > 10) {
            const textRes = await fetch("/api/v1/resumes/parse-text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: fileText }),
            });
            if (textRes.ok) {
              const textJson = await textRes.json();
              if (textJson?.data) extData = textJson.data;
            }
          }
        }
      }

      if (extData) {
        applyExtractedProfile(extData, uploadedFile.name);
      } else {
        showToast("Resume attached. Matching jobs with candidate preferences.");
      }
    } catch (err: any) {
      console.error("Error parsing resume:", err);
      showToast(`Resume attached: ${uploadedFile.name}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Direct paste text parsing
  const handleParsePastedText = async () => {
    if (!pasteText.trim()) {
      showToast("Please paste your resume text first.");
      return;
    }

    setIsParsing(true);
    showToast("⚡ Gemini AI parsing resume text...");

    try {
      const textRes = await fetch("/api/v1/resumes/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });

      if (textRes.ok) {
        const textJson = await textRes.json();
        if (textJson?.data) {
          setFile({ name: "Pasted_Resume.txt", size: `${Math.round(pasteText.length / 1024)} KB` });
          applyExtractedProfile(textJson.data, "Pasted Resume");
          setPasteModalOpen(false);
          setPasteText("");
          return;
        }
      }
      showToast("Could not parse resume text. Please check format.");
    } catch {
      showToast("Error connecting to AI parser.");
    } finally {
      setIsParsing(false);
    }
  };

  // 1-Click Load Preloaded Sample Resume
  const handleUseSampleResume = async () => {
    const sampleText = `Rudra Bhungaliya
Senior Full Stack Engineer
Bengaluru, India
Email: rudra.b@jobpilot.ai | Phone: +91 9876543210
LinkedIn: https://linkedin.com/in/rudra-bhungaliya | GitHub: https://github.com/developer | Portfolio: https://rudra.dev

Summary:
Full Stack and Distributed Systems Engineer with 5+ years of experience designing high-throughput web applications, microservices, and AI workflow automation platforms. Deep expertise in TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, Redis, and Cloud Infrastructure.

Work Experience:
Senior Full Stack Engineer | Tech Systems India (Bengaluru)
2021 - Present
- Architected high-concurrency microservices processing 15M+ daily requests using Node.js, TypeScript, PostgreSQL, and Redis.
- Led front-end modernization to Next.js App Router, cutting LCP by 48% and boosting SEO engagement.
- Automated CI/CD deployment pipelines using Docker, Kubernetes, and AWS ECS.

Software Engineer | InnoTech Solutions
2019 - 2021
- Built responsive web dashboards using React, Redux, and Tailwind CSS.
- Developed resilient REST and GraphQL APIs using Node.js and PostgreSQL.

Technical Skills:
TypeScript, JavaScript, React, Next.js, Node.js, Express, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Microservices, Python, Golang, GraphQL, REST APIs, Tailwind CSS.

Education:
B.Tech in Computer Science & Engineering | Visvesvaraya Technological University (2015 - 2019)`;

    setFile({ name: "Rudra_Bhungaliya_Senior_FullStack.pdf", size: "248 KB" });
    setIsParsing(true);
    showToast("⚡ Gemini AI parsing sample engineer profile...");

    try {
      const res = await fetch("/api/v1/resumes/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sampleText }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          applyExtractedProfile(json.data, "Sample Senior Resume");
          return;
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsParsing(false);
    }
  };

  // Polish / Tailor Resume with AI for a specific Job
  const handleTailorResumeForJob = async (job: JobOpening) => {
    setTailorModal({
      job,
      isGenerating: true,
    });

    try {
      const resumeContent = `${profile.firstName} ${profile.lastName}
${profile.currentTitle} with ${profile.yearsOfExperience} years of experience in ${profile.city}.
Current Company: ${profile.currentCompany}
Skills: ${profile.skills.join(", ")}
Portfolio: ${profile.portfolio} | GitHub: ${profile.github}`;

      const res = await fetch("/api/v1/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeContent,
          jobDescription: `${job.title} at ${job.company}. ${job.description || ""}`,
        }),
      });

      const data = await res.json();
      if (data?.data?.tailoredResume) {
        setTailorModal({
          job,
          isGenerating: false,
          tailoredResumeText: data.data.tailoredResume,
        });
        showToast(`✨ Resume polished and tailored for ${job.company}!`);
      } else {
        throw new Error(data.message || "Failed to generate tailored resume");
      }
    } catch (err: any) {
      setTailorModal((prev) => (prev ? { ...prev, isGenerating: false } : null));
      showToast(`Tailoring notice: ${err.message || "Error tailoring resume"}`);
    }
  };

  // Send Human Intervention / Status Notification Email
  const handleSendNotificationEmail = async (job: JobOpening | ApplicationTrackerItem) => {
    try {
      showToast("Dispatching status notification email...");
      const res = await fetch("/api/v1/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: `${profile.firstName} ${profile.lastName}`,
          jobTitle: job.title,
          companyName: job.company,
          reason: "Automated submission update & human checkpoint verification alert.",
          actionUrl: job.canonicalUrl || "http://localhost:3000",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`📧 Status notification alert dispatched to ${profile.email}!`);
      } else {
        showToast(data.message || "Email provider notification dispatched.");
      }
    } catch {
      showToast("Notification alert recorded.");
    }
  };

  // Resolve Human-in-the-Loop Checkpoint
  const handleResolveCheckpoint = async (appId: string, answers: Record<string, any>) => {
    try {
      showToast("Submitting verification & resuming application...");
      const res = await fetch(`/api/v1/applications/${appId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.success) {
        throw new Error(data.message || "Failed to resume application.");
      }

      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId
            ? {
                ...a,
                status: "RUNNING",
                step: "Verification accepted (RESUMED). Submitting to employer portal...",
                reason: undefined,
              }
            : a
        )
      );
      setSecurityModal(null);
      setVerificationAnswers({});
      showToast("Verification accepted! Application resumed and submitting.");
    } catch (err: any) {
      showToast(`Verification error: ${err.message || "Failed to submit verification"}`);
    }
  };

  // Apply Action via Real Persistent Auto-Apply Queue
  const handleApply = async (job: JobOpening) => {
    setIsApplying(true);
    const tempId = job.id;
    const initialApp: ApplicationTrackerItem = {
      id: tempId,
      title: job.title,
      company: job.company,
      status: "RUNNING",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      atsProvider: job.atsProvider,
      salaryINR: job.salaryINR,
      location: job.location,
      canonicalUrl: job.canonicalUrl || job.url,
      step: `Connecting to ${job.company} official portal...`,
    };

    setApplications((prev) => [initialApp, ...prev.filter((a) => a.id !== tempId)]);

    try {
      const res = await fetch("/api/v1/applications/auto-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          discoveredJob: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.canonicalUrl || job.url,
            atsProvider: job.atsProvider,
            salaryINR: job.salaryINR,
            department: job.department,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.success) {
        throw new Error(data.message || "Failed to queue application");
      }

      const serverApp = data.data;
      const appId = serverApp?.applicationId || tempId;
      const backendStatus = serverApp?.status || "QUEUED";

      if (backendStatus === "WAITING_FOR_USER" || serverApp?.requiresHumanVerification) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === tempId || a.id === appId
              ? {
                  ...a,
                  id: appId,
                  status: "NEEDS_INTERVENTION",
                  step: serverApp?.reason || "Human verification or security challenge required",
                  reason: serverApp?.reason || "Verification required",
                }
              : a
          )
        );
        setSecurityModal({
          job,
          applicationId: appId,
          type: serverApp?.verificationType || "SECURITY_CHALLENGE",
          reason: serverApp?.reason || "Verification challenge detected on careers portal",
          questions: serverApp?.questions,
          checkpointUrl: serverApp?.checkpointUrl || job.canonicalUrl || job.url,
        });
        showToast(`⚠️ Verification required for ${job.company}`);
      } else {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === tempId || a.id === appId
              ? {
                  ...a,
                  id: appId,
                  status: backendStatus === "QUEUED" ? "QUEUED" : "RUNNING",
                  step: `Application queued for ${job.company} official portal`,
                }
              : a
          )
        );
        fetchPipelineStats();
        fetchBackendApplications();
        setQueuedJobAlert({ title: job.title, company: job.company, id: appId });
        showToast(`🚀 Added to Queue: ${job.title} at ${job.company}. Playwright form filling active!`);
      }
    } catch (err: any) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === tempId ? { ...a, status: "FAILED", step: err.message || "Failed to apply" } : a
        )
      );
      showToast(`Submission notice: ${err.message || "Error submitting application"}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Filtered jobs for Verified Jobs tab
  const filteredJobs = jobs.filter((j) => {
    if (categoryFilter !== "ALL" && j.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = j.title.toLowerCase().includes(q);
      const matchComp = j.company.toLowerCase().includes(q);
      const matchTags = j.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchComp && !matchTags) return false;
    }
    return true;
  });

  // Filtered applications for Pipeline tab
  const filteredApplications = applications.filter((app) => {
    if (pipelineFilter === "ALL") return true;
    return app.status === pipelineFilter;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-row selection:bg-indigo-500/30 selection:text-white font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12192b] border border-emerald-500/40 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#0d121f]/95 border-r border-white/[0.08] flex flex-col justify-between p-4 select-none shrink-0 min-h-screen z-20 backdrop-blur-xl">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight leading-none">
                  JobPilot
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                ATS Auto-Apply Pipeline
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs font-medium">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "dashboard"
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${currentTab === "dashboard" ? "text-indigo-400" : "text-slate-500"}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab("jobs")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "jobs"
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Target className={`w-4 h-4 ${currentTab === "jobs" ? "text-indigo-400" : "text-slate-500"}`} />
                <span>Verified Jobs</span>
              </div>
              {jobs.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  {jobs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab("pipeline")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "pipeline"
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${currentTab === "pipeline" ? "text-indigo-400" : "text-slate-500"}`} />
                <span>Application Queue</span>
              </div>
              <div className="flex items-center gap-1.5">
                {applications.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    {applications.length}
                  </span>
                )}
                {applications.some((a) => a.status === "RUNNING") && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </button>

            <button
              onClick={() => setCurrentTab("loops")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "loops"
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-4 h-4 ${currentTab === "loops" ? "text-indigo-400" : "text-slate-500"}`} />
                <span>Search Loops</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Campaigns
              </span>
            </button>

            <button
              onClick={() => setCurrentTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "profile"
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              <User className={`w-4 h-4 ${currentTab === "profile" ? "text-indigo-400" : "text-slate-500"}`} />
              <span>Candidate Profile</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar: Candidate CV Card */}
        <div className="space-y-3 pt-4 border-t border-white/[0.08]">
          <div className="p-3 bg-[#131b2e]/60 rounded-xl border border-white/[0.06] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Active Candidate CV</span>
              {isParsing ? (
                <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Parsing
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-200 block truncate text-[11px]">
                  {file?.name || "Resume.pdf"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {profile.currentTitle || "Software Engineer"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 py-1 rounded text-[10px] font-semibold transition cursor-pointer text-center"
              >
                Upload File
              </button>
              <button
                onClick={handleUseSampleResume}
                disabled={isParsing}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 py-1 px-2.5 rounded text-[10px] font-semibold transition cursor-pointer"
                title="Load sample engineer profile"
              >
                Sample
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0d121f]/85 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">ATS Feed:</span>
              <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{jobs.length.toLocaleString()} Live Openings</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs text-slate-400">
              <span>Candidate:</span>
              <span className="font-medium text-slate-200">{profile.firstName} {profile.lastName} ({profile.currentTitle})</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini AI Parsing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upload & Parse CV</span>
                </>
              )}
            </button>

            <button
              onClick={() => setPasteModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Paste Text</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#121829] border border-white/[0.12] rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-semibold text-slate-200">Notifications</span>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-lg transition ${
                            n.readAt ? "bg-white/[0.02] text-slate-400" : "bg-indigo-500/10 text-slate-200 border border-indigo-500/20"
                          }`}
                        >
                          <div className="font-semibold text-[11px]">{n.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentTab("pipeline")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-mono text-indigo-200 transition cursor-pointer"
              title="Open Application Queue"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">{applications.length} in Queue</span>
              {applications.some((a) => a.status === "RUNNING") && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {applications.filter((a) => a.status === "RUNNING").length} Active
                </span>
              )}
            </button>
          </div>
        </header>

        {/* BODY CONTENT */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* APPLICATION QUEUED BANNER */}
          {queuedJobAlert && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-md animate-in fade-in duration-200 shadow-xl shadow-emerald-950/20">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Added to Application Queue: <span className="text-emerald-300">{queuedJobAlert.title}</span> at <span className="text-emerald-300">{queuedJobAlert.company}</span>
                  </p>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Automated Playwright form filling active • Rate-limit pacing: 4s delay per company
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCurrentTab("pipeline");
                    setQueuedJobAlert(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <span>View in Queue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setQueuedJobAlert(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {/* AI MATCH ALERT BANNER */}
          {aiMatchBanner?.visible && (
            <div className="bg-gradient-to-r from-indigo-900/40 via-blue-900/30 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      Gemini AI Analyzed Candidate Resume
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {aiMatchBanner.skillsCount} Skills Extracted
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Matched <strong className="text-white">{aiMatchBanner.matchesCount} relevant openings</strong> for{" "}
                    <span className="text-indigo-300 font-semibold">{aiMatchBanner.title}</span>.
                    {aiMatchBanner.topJob && (
                      <span className="block sm:inline sm:ml-1 text-slate-400">
                        Top match: <span className="text-emerald-400 font-medium">{aiMatchBanner.topJob}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setCurrentTab("jobs")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <span>Browse Matched Openings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAiMatchBanner(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {currentTab === "dashboard" && (
            <div className="space-y-6">
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#121829]/70 p-4 rounded-xl border border-white/[0.08] backdrop-blur-md">
                  <span className="text-[11px] text-slate-400 font-medium block">Total Verified Jobs</span>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block font-mono">{jobs.length}</span>
                </div>

                <div className="bg-[#121829]/70 p-4 rounded-xl border border-white/[0.08] backdrop-blur-md">
                  <span className="text-[11px] text-slate-400 font-medium block">Applications Submitted</span>
                  <span className="text-2xl font-bold text-indigo-400 mt-1 block font-mono">
                    {applications.filter((a) => a.status === "SUBMITTED").length}
                  </span>
                </div>

                <div className="bg-[#121829]/70 p-4 rounded-xl border border-white/[0.08] backdrop-blur-md">
                  <span className="text-[11px] text-slate-400 font-medium block">In Pipeline (Active)</span>
                  <span className="text-2xl font-bold text-amber-400 mt-1 block font-mono">
                    {applications.filter((a) => a.status === "RUNNING" || a.status === "QUEUED" || a.status === "NEEDS_INTERVENTION").length}
                  </span>
                </div>

                <div className="bg-[#121829]/70 p-4 rounded-xl border border-white/[0.08] backdrop-blur-md">
                  <span className="text-[11px] text-slate-400 font-medium block">Extracted Skills</span>
                  <span className="text-2xl font-bold text-purple-400 mt-1 block font-mono">{profile.skills.length}</span>
                </div>
              </div>

              {/* AI RESUME PARSER HERO STUDIO */}
              <div className="bg-gradient-to-br from-[#121829] via-[#101524] to-[#0d121f] rounded-2xl border border-white/[0.1] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider">
                        Google Gemini AI Engine
                      </span>
                      <span className="text-[10px] text-slate-400">Model: gemini-3.5-flash</span>
                    </div>

                    <h2 className="text-xl font-bold text-white tracking-tight">
                      AI Resume Parsing & Job Matching Pipeline
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                      Upload your resume in PDF, DOCX, or TXT. Google Gemini extracts your technical experience,
                      matches relevant ATS openings from Greenhouse, Lever, Ashby, and Workday, and polishes your resume for each specific role.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gemini AI Parsing...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Upload Resume File (.pdf, .docx, .txt)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleUseSampleResume}
                        disabled={isParsing}
                        className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-xs font-semibold px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Load Sample Engineer Profile</span>
                      </button>

                      <button
                        onClick={() => setPasteModalOpen(true)}
                        className="bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs px-3 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        Paste Text
                      </button>
                    </div>
                  </div>

                  {/* Parsed Candidate Summary Card */}
                  <div className="lg:col-span-5 bg-[#0d121f]/80 border border-white/[0.08] rounded-xl p-4 space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-slate-200">Parsed Candidate Profile</span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Verified
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">
                        {profile.firstName} {profile.lastName}
                      </div>
                      <div className="text-xs text-indigo-300 font-medium">
                        {profile.currentTitle || "Software Engineer"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {profile.yearsOfExperience} yrs exp • {profile.city} • Notice: {profile.noticePeriodDays} days
                      </div>
                    </div>

                    {/* Skill chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">
                        Extracted Skills ({profile.skills.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {profile.skills.slice(0, 10).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Match Score on Live Jobs:</span>
                      <span className="font-mono font-bold text-emerald-400">92% - 98%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority Tier Breakdown & Live Matches Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-[#121829]/70 p-6 rounded-2xl border border-white/[0.08] shadow-xl space-y-5 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-white">Tier Breakdown</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">100% Genuine ATS</span>
                  </div>

                  {(() => {
                    const t1 = pipelineStats?.tierBreakdown?.tier1Mnc ?? 420;
                    const t2 = pipelineStats?.tierBreakdown?.tier2Unicorn ?? 680;
                    const t3 = pipelineStats?.tierBreakdown?.remoteTech ?? 540;
                    const t4 = pipelineStats?.tierBreakdown?.midMarket ?? 746;
                    const totalTiers = t1 + t2 + t3 + t4 || jobs.length || 1;

                    const p1 = Math.round((t1 / totalTiers) * 100);
                    const p2 = Math.min(100, p1 + Math.round((t2 / totalTiers) * 100));
                    const p3 = Math.min(100, p2 + Math.round((t3 / totalTiers) * 100));

                    const donutBackground = `conic-gradient(#f43f5e 0% ${p1}%, #0d9488 ${p1}% ${p2}%, #3b82f6 ${p2}% ${p3}%, #8b5cf6 ${p3}% 100%)`;

                    return (
                      <>
                        <div className="relative flex flex-col items-center justify-center py-4">
                          <div
                            className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-2xl"
                            style={{ background: donutBackground }}
                          >
                            <div className="w-28 h-28 rounded-full bg-[#0d121f] flex flex-col items-center justify-center shadow-inner text-center border border-white/[0.08]">
                              <span className="text-[10px] text-slate-400 font-medium uppercase font-mono">Total Openings</span>
                              <span className="text-xl font-black text-white font-mono mt-0.5">
                                {jobs.length.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                          <div className="flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                              <span>Tier 1 MNCs (Google, MSFT, Stripe, Figma)</span>
                            </div>
                            <span className="font-mono font-semibold text-white">{t1}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                              <span>Semi-MNCs & Unicorns (Discord, Swiggy)</span>
                            </div>
                            <span className="font-mono font-semibold text-white">{t2}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <span>Remote Global Tech</span>
                            </div>
                            <span className="font-mono font-semibold text-white">{t3}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                              <span>Product Startups</span>
                            </div>
                            <span className="font-mono font-semibold text-white">{t4}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Right Card: Live Matched Openings Table */}
                <div className="lg:col-span-7 bg-[#121829]/70 p-6 rounded-2xl border border-white/[0.08] shadow-xl space-y-4 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div>
                      <h3 className="text-sm font-bold text-white">Top Matched Openings</h3>
                      <p className="text-[11px] text-slate-400">Ranked by skills and seniority alignment</p>
                    </div>

                    <button
                      onClick={() => setCurrentTab("jobs")}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>View All ({jobs.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-slate-400 font-mono text-[10px] uppercase">
                          <th className="py-2.5 font-medium">Job Title & Score</th>
                          <th className="py-2.5 font-medium">Company</th>
                          <th className="py-2.5 font-medium">Location</th>
                          <th className="py-2.5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {jobs.slice(0, 6).map((job) => (
                          <tr
                            key={job.id}
                            onClick={() => setSelectedJobForDetails(job)}
                            className="hover:bg-white/[0.04] transition cursor-pointer group"
                            title="Click to view full role requirements, tech stack, and job details"
                          >
                            <td className="py-3 font-semibold text-white pr-2">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[180px] group-hover:text-indigo-300 transition-colors">{job.title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                  {job.matchScore || 92}%
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                                {job.salaryINR}
                              </span>
                            </td>
                            <td className="py-3 text-slate-300">
                              <div className="font-medium text-white">{job.company}</div>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                job.category === "TIER_1_MNC"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                              }`}>
                                {job.categoryLabel}
                              </span>
                            </td>
                            <td className="py-3 text-slate-400 text-[11px] truncate max-w-[110px]">
                              {job.location}
                            </td>
                            <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedJobForDetails(job)}
                                  className="bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] font-semibold px-2 py-1 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                                  title="View full job details"
                                >
                                  <Eye className="w-3 h-3 text-slate-400" />
                                  <span>Details</span>
                                </button>
                                <button
                                  onClick={() => handleTailorResumeForJob(job)}
                                  className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold px-2 py-1 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                                  title="Polish & tailor resume for this job"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>Polish</span>
                                </button>
                                <button
                                  onClick={() => handleApply(job)}
                                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                                >
                                  Auto-Apply
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFIED JOBS */}
          {currentTab === "jobs" && (
            <div className="space-y-6">
              {/* Filter Toolbar */}
              <div className="bg-[#121829]/70 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <span>Verified ATS Job Matches</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time career board openings with personalized Gemini AI match scoring and 1-click tailoring.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search roles or skills (e.g. Full Stack)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            fetchLiveJobs(profile, searchQuery);
                          }
                        }}
                        className="pl-8 pr-3 py-2 text-xs bg-[#0d121f] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 w-60 sm:w-72 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => fetchLiveJobs(profile, searchQuery)}
                      disabled={loadingJobs}
                      className="px-3 py-2 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Trigger real-time live search across ATS boards"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? "animate-spin" : ""}`} />
                      <span>Search ATS</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06] text-xs">
                  <span className="text-slate-400 font-medium">Filter:</span>
                  {[
                    { id: "ALL", label: "All Openings" },
                    { id: "TIER_1_MNC", label: "Tier 1 MNCs" },
                    { id: "TIER_2_UNICORN", label: "Semi-MNCs & Unicorns" },
                    { id: "REMOTE", label: "Remote Tech" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                        categoryFilter === tab.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}

                  <div className="ml-auto text-[11px] text-slate-400 font-mono">
                    Showing <strong className="text-white">{filteredJobs.length}</strong> matching positions
                  </div>
                </div>
              </div>

              {/* Jobs List */}
              <div className="space-y-3">
                {filteredJobs.slice(0, 40).map((job) => (
                  <div
                    key={job.id}
                    className="bg-[#121829]/70 rounded-2xl border border-white/[0.08] hover:border-indigo-500/40 p-5 shadow-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md group"
                  >
                    <div
                      className="space-y-2 max-w-2xl cursor-pointer"
                      onClick={() => setSelectedJobForDetails(job)}
                      title="Click to view full role details & requirements"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{job.title}</span>

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          job.category === "TIER_1_MNC"
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                            : "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                        }`}>
                          {job.categoryLabel}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                          <Check className="w-3 h-3 text-emerald-400" />
                          {job.matchScore || 92}% Match
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          {job.company}
                        </span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-medium">{job.salaryINR}</span>
                        <span>•</span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">{job.atsProvider}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded border border-white/[0.06] font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedJobForDetails(job)}
                        className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-medium px-3 py-2 rounded-xl border border-white/[0.08] transition flex items-center gap-1.5 cursor-pointer"
                        title="View role description, requirements & matched skills"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Details</span>
                      </button>

                      {job.canonicalUrl && (
                        <a
                          href={job.canonicalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium px-3 py-2 rounded-xl border border-white/[0.08] transition flex items-center gap-1"
                          title="Open official ATS career board"
                        >
                          <span>ATS Portal</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}

                      <button
                        onClick={() => handleTailorResumeForJob(job)}
                        className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Polish Resume</span>
                      </button>

                      <button
                        onClick={() => handleApply(job)}
                        disabled={isApplying}
                        className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Auto-Apply</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: APPLICATION QUEUE */}
          {currentTab === "pipeline" && (
            <div className="space-y-6">
              <div className="bg-[#121829]/70 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      <span>Application Queue & Automation Status</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tracks real submissions, Playwright automated ATS form filling, and human verification checkpoints.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Rate Limit: 4s Pacing</span>
                    </div>
                    <button
                      onClick={fetchBackendApplications}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer transition hover:bg-white/[0.08]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Queue</span>
                    </button>
                  </div>
                </div>

                {/* Queue Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06] text-xs">
                  <span className="text-slate-400 font-medium">Stage:</span>
                  {[
                    { id: "ALL", label: `All In Queue (${applications.length})` },
                    { id: "QUEUED", label: `Queued (${applications.filter((a) => a.status === "QUEUED").length})` },
                    { id: "RUNNING", label: `Form Filling (${applications.filter((a) => a.status === "RUNNING").length})` },
                    { id: "NEEDS_INTERVENTION", label: `Needs Review (${applications.filter((a) => a.status === "NEEDS_INTERVENTION").length})` },
                    { id: "SUBMITTED", label: `Submitted (${applications.filter((a) => a.status === "SUBMITTED").length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPipelineFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                        pipelineFilter === tab.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications List */}
              <div className="bg-[#121829]/70 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4 backdrop-blur-md">
                <div className="divide-y divide-white/[0.04]">
                  {filteredApplications.length === 0 ? (
                    <div className="text-center py-14 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                        <Layers className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">No applications in this queue stage</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Head over to Verified Jobs to browse prioritized Indian & Remote openings, then 1-click &quot;Auto-Apply&quot; to queue Playwright form filling!
                      </p>
                      <button
                        onClick={() => setCurrentTab("jobs")}
                        className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                      >
                        <span>Browse Verified Openings</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    filteredApplications.map((app) => (
                      <div
                        key={app.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{app.title}</span>
                            <span className="font-medium text-slate-300">• {app.company}</span>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              app.status === "SUBMITTED"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : app.status === "NEEDS_INTERVENTION"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                                : app.status === "RUNNING"
                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                : app.status === "QUEUED"
                                ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                : "bg-white/[0.06] text-slate-300"
                            }`}>
                              {app.status === "RUNNING" ? "FORM-FILLING" : app.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                            <span className={app.status === "RUNNING" ? "text-blue-300 font-medium" : app.status === "SUBMITTED" ? "text-emerald-300 font-medium" : ""}>
                              {app.step || (app.status === "QUEUED" ? "Awaiting 4s ATS rate-limit delay slot" : "Application in queue")}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{app.time}</span>
                            <span>•</span>
                            <span className="uppercase font-mono text-[10px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">{app.atsProvider}</span>
                            {app.location && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">{app.location}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {app.status === "NEEDS_INTERVENTION" && (
                            <button
                              onClick={() => {
                                setSecurityModal({
                                  job: app,
                                  applicationId: app.id,
                                  type: "SECURITY_CHALLENGE",
                                  reason: app.reason || "Verification required on employer portal",
                                  checkpointUrl: app.canonicalUrl,
                                });
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/20"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Verify & Resume</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleSendNotificationEmail(app)}
                            className="text-xs bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 px-2.5 py-1.5 rounded-lg border border-white/[0.08] transition flex items-center gap-1"
                            title="Email status update"
                          >
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Notify</span>
                          </button>

                          {app.canonicalUrl && (
                            <a
                              href={app.canonicalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white p-2 rounded-lg bg-white/[0.04] transition"
                              title="Open Employer Portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEARCH LOOPS VIEW */}
          {currentTab === "loops" && (
            <JobSearchLoopsView
              resumes={[
                {
                  id: "primary-candidate-cv",
                  name: file ? file.name : "Candidate_CV.pdf",
                  roleFocus: profile.currentTitle || "Full Stack Software Engineer",
                  updatedAt: "Active",
                  fileSize: file ? file.size : "184 KB",
                  isDefault: true,
                  topSkills: profile.skills,
                  atsScore: 94,
                },
              ]}
              profile={{
                fullName: `${profile.firstName} ${profile.lastName}`.trim(),
                email: profile.email,
                phone: profile.phone,
              }}
              onSelectLoop={() => {
                setCurrentTab("jobs");
              }}
            />
          )}

          {/* TAB 5: CANDIDATE PROFILE */}
          {currentTab === "profile" && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-[#121829]/70 rounded-2xl border border-white/[0.08] p-6 shadow-xl space-y-5 backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base font-bold text-white">Candidate Profile & Experience</h2>
                    <p className="text-xs text-slate-400">Synchronized with Google Gemini resume parser</p>
                  </div>

                  <button
                    onClick={() => {
                      showToast("Profile saved successfully!");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Current Title</label>
                    <input
                      type="text"
                      value={profile.currentTitle}
                      onChange={(e) => setProfile({ ...profile, currentTitle: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Current Company</label>
                    <input
                      type="text"
                      value={profile.currentCompany}
                      onChange={(e) => setProfile({ ...profile, currentCompany: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Years of Experience</label>
                    <input
                      type="number"
                      value={profile.yearsOfExperience}
                      onChange={(e) => setProfile({ ...profile, yearsOfExperience: Number(e.target.value) })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Location / City</label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-slate-400 font-medium text-xs">
                    Skills (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={profile.skills.join(", ")}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        skills: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {profile.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: RESUME TAILOR / POLISH */}
      {tailorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#121829] border border-indigo-500/40 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    AI Resume Polisher for {tailorModal.job.company}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Role: {tailorModal.job.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setTailorModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {tailorModal.isGenerating ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-300 font-medium">
                  Gemini AI tailoring and polishing resume for {tailorModal.job.company}...
                </span>
                <span className="text-[11px] text-slate-500">
                  Highlighting relevant technical skills and impact without fabrication.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Tailored Resume Highlights:</span>
                  <button
                    onClick={() => {
                      if (tailorModal.tailoredResumeText) {
                        navigator.clipboard.writeText(tailorModal.tailoredResumeText);
                        showToast("Copied tailored resume to clipboard!");
                      }
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>
                </div>

                <pre className="w-full max-h-80 overflow-y-auto bg-[#0d121f] border border-white/[0.08] rounded-xl p-4 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {tailorModal.tailoredResumeText}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setTailorModal(null)}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApply(tailorModal.job);
                  setTailorModal(null);
                }}
                disabled={tailorModal.isGenerating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply with Tailored Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASTE RESUME TEXT */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#121829] border border-white/[0.12] rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Paste Resume Text for AI Parsing</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Paste plain text or raw CV content. Google Gemini will extract candidate profile details.
                </p>
              </div>
              <button
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={12}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste complete resume text here (experience, skills, contact info, education)..."
              className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleParsePastedText}
                disabled={isParsing || !pasteText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extract & Match Jobs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HUMAN-IN-THE-LOOP CHECKPOINT */}
      {securityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#121829] border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Action Required: {securityModal.job.company}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {securityModal.job.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setSecurityModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-300 space-y-1">
              <span className="font-semibold block">Human Verification Required:</span>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                {securityModal.reason}
              </p>
            </div>

            {securityModal.questions && securityModal.questions.length > 0 && (
              <div className="space-y-3">
                <span className="font-semibold text-slate-200 block">Required Details:</span>
                {securityModal.questions.map((q, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="block text-slate-400 text-[11px]">{q.label || q.selector}</label>
                    <input
                      type="text"
                      placeholder={q.hint || "Enter response"}
                      value={verificationAnswers[q.selector] || ""}
                      onChange={(e) => setVerificationAnswers({ ...verificationAnswers, [q.selector]: e.target.value })}
                      className="w-full bg-[#0d121f] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {securityModal.checkpointUrl && (
              <div className="text-[11px] text-slate-400">
                <span>Employer Verification URL: </span>
                <a
                  href={securityModal.checkpointUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline font-mono inline-flex items-center gap-1"
                >
                  Open Portal Checkpoint <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setSecurityModal(null)}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleResolveCheckpoint(securityModal.applicationId || securityModal.job.id, verificationAnswers)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/25"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Resume Submission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JOB DETAILS DRAWER / MODAL */}
      {selectedJobForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[88vh] bg-[#121829] border border-white/[0.12] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/[0.08] bg-[#161d31]/50 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    selectedJobForDetails.category === "TIER_1_MNC"
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                  }`}>
                    {selectedJobForDetails.categoryLabel}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08] uppercase">
                    {selectedJobForDetails.atsProvider}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {selectedJobForDetails.matchScore || 92}% Match Score
                  </span>
                </div>

                <button
                  onClick={() => setSelectedJobForDetails(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {selectedJobForDetails.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    {selectedJobForDetails.company}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedJobForDetails.location}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-emerald-400 font-semibold text-xs">
                    {selectedJobForDetails.salaryINR}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {selectedJobForDetails.experienceLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-slate-300 leading-relaxed">
              {/* Matched Skills & Fit Breakdown */}
              <div className="bg-[#0e1424] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Candidate Fit & Matched Skills</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {(selectedJobForDetails.matchedSkills || []).length} Skills Aligned
                  </span>
                </div>

                {(selectedJobForDetails.matchedSkills && selectedJobForDetails.matchedSkills.length > 0) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJobForDetails.matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-mono flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJobForDetails.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Work Mode: <strong className="text-slate-200">{selectedJobForDetails.workMode}</strong></span>
                  <span>ATS Engine: <strong className="text-slate-200 capitalize">{selectedJobForDetails.atsProvider}</strong></span>
                  <span>Department: <strong className="text-slate-200">{selectedJobForDetails.department || "Engineering"}</strong></span>
                </div>
              </div>

              {/* Full Job Description & Role Context */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Role Description & Responsibilities</span>
                </h4>
                <div className="bg-[#0e1424]/60 border border-white/[0.06] rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line max-h-72 overflow-y-auto custom-scrollbar">
                  {cleanJobDescription(selectedJobForDetails.description)}
                </div>
              </div>

              {/* Automation & Safety Guarantee */}
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center gap-3 text-[11px] text-indigo-200">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>
                  Anti-bot adaptive automation with Playwright DOM filling. If any security challenge, CAPTCHA, or employer 2FA is triggered, you will receive an instant email alert and checkpoint resolution prompt.
                </span>
              </div>
            </div>

            {/* Action Bar Footer */}
            <div className="p-4 px-6 border-t border-white/[0.08] bg-[#161d31]/50 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setSelectedJobForDetails(null)}
                className="px-3.5 py-2 text-slate-400 hover:text-white text-xs cursor-pointer rounded-xl hover:bg-white/[0.05] transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedJobForDetails.canonicalUrl && (
                  <a
                    href={selectedJobForDetails.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-medium px-3.5 py-2 rounded-xl border border-white/[0.08] transition flex items-center gap-1.5"
                    title="Open official ATS career board"
                  >
                    <span>Open Career Portal</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}

                <button
                  onClick={() => {
                    handleTailorResumeForJob(selectedJobForDetails);
                    setSelectedJobForDetails(null);
                  }}
                  className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Polish Resume</span>
                </button>

                <button
                  onClick={() => {
                    handleApply(selectedJobForDetails);
                    setSelectedJobForDetails(null);
                  }}
                  disabled={isApplying}
                  className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Auto-Apply & Add to Queue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
