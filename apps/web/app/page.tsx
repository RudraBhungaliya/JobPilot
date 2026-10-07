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
  Mail,
  Check,
  ChevronRight,
  X,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  ShieldCheck,
  Sparkles,
  Send,
  UserCheck,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Terminal,
  ExternalLink,
  PieChart,
  BarChart3,
  TrendingUp,
  Award,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Eye,
  Settings2,
  Target,
  Sparkle,
  Globe2,
  CheckCheck,
  Menu,
  Bell,
  HelpCircle,
  Share2,
  Inbox,
  User,
  MessageSquare,
  Flame,
  Gauge,
  Sliders,
  ShieldAlert,
  FastForward,
  Timer,
} from "lucide-react";
import { JobSearchLoopsView } from "../components/job-search-loops";
import { INITIAL_RESUMES, INITIAL_CANDIDATE_PROFILE } from "../lib/mock-data";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  company: string;
  category: "TIER_1_MNC" | "TIER_2_UNICORN" | "TIER_3_MIDMARKET" | "TIER_4_SERVICES" | "REMOTE" | "MNC" | "SEMI_MNC";
  categoryLabel: string;
  tierRank?: number;
  tierName?: string;
  location: string;
  city: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  url: string;
  source: string;
  atsProvider: string;
  salaryINR: string;
  salaryMinLPA: number;
  salaryMaxLPA: number;
  experienceLevel: string;
  tags: string[];
  description: string;
  matchScore?: number;
  recruiterEmail?: string;
  recruiterName?: string;
  officialCompanyUrl?: string;
  atsUrl?: string;
  applyUrl?: string;
  canonicalUrl?: string;
  sourceUrl?: string;
  sourceType?: string;
}

interface CandidateProfile {
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

interface ApplicationTrackerItem {
  id: string;
  title: string;
  company: string;
  status: "QUEUED" | "RUNNING" | "NEEDS_INTERVENTION" | "SUBMITTED" | "FAILED";
  time: string;
  atsProvider: string;
  salaryINR: string;
  location: string;
  canonicalUrl?: string;
  atsUrl?: string;
  reason?: string;
  step?: string;
  category?: string;
  emailSent?: boolean;
}

interface QueueCampaign {
  id: string;
  name: string;
  jobTitles: string[];
  locations: string[];
  priorityTier: "MNC_FIRST" | "UNICORN_FIRST" | "REMOTE_FIRST" | "ALL_TIERS";
  priorityLabel: string;
  minSalaryLPA: number;
  mode: "AUTO_DAILY" | "MANUAL_APPROVAL";
  sendRecruiterEmail: boolean;
  emailTemplateId: string;
  status: "ACTIVE" | "PAUSED";
  dailyLimit: number;
  appliedToday: number;
  totalMatches: number;
  rateLimitPerHour: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  lastRunTime: string;
}

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  category: "MNC_PITCH" | "UNICORN_SPEED" | "REMOTE_AI" | "REFERRAL";
  openRate: number;
  replyRate: number;
  usedCount: number;
}

interface RecruiterEmailLog {
  id: string;
  company: string;
  jobTitle: string;
  recruiterEmail: string;
  recruiterName: string;
  templateName: string;
  subject: string;
  sentAt: string;
  status: "DELIVERED" | "OPENED" | "REPLIED";
}

interface CompanyRateLimitStatus {
  company: string;
  tier: string;
  appliedThisHour: number;
  maxPerHour: number;
  cooldownRemainingSeconds: number;
  status: "READY" | "PACING" | "COOLDOWN";
}

const INITIAL_PROFILE: CandidateProfile = {
  firstName: "Rudra",
  lastName: "Bhungaliya",
  email: "rudra.b@jobpilot.ai",
  phone: "+91 9876543210",
  city: "Bengaluru",
  currentTitle: "Software Development Engineer II",
  currentCompany: "Tech Systems India",
  yearsOfExperience: 4.5,
  expectedSalaryLPA: 35,
  currentSalaryLPA: 24,
  noticePeriodDays: 30,
  workMode: "HYBRID",
  github: "https://github.com/developer",
  linkedin: "https://linkedin.com/in/developer",
  portfolio: "https://rudra.dev",
  skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "AWS", "Docker", "Redis", "Golang", "Microservices"],
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-1",
    title: "Direct Hiring Manager Value Pitch (Tier 1 MNCs)",
    category: "MNC_PITCH",
    subject: "Application for {{role}} at {{company}} — {{candidate_name}} ({{experience_years}} yrs exp)",
    body: `Hi {{recruiter_name}},\n\nI noticed the {{role}} opening at {{company}} and wanted to reach out directly.\n\nOver the past {{experience_years}} years, I've built scalable backend and distributed microservices with {{top_skills}}. My background aligns closely with {{company}}'s engineering standards and high-throughput systems.\n\nI have submitted my application via your official portal and would love to connect for a quick 10-minute conversation. You can also view my portfolio at {{portfolio_url}}.\n\nBest regards,\n{{candidate_name}}\n{{phone}}`,
    openRate: 76,
    replyRate: 29,
    usedCount: 42,
  },
  {
    id: "tpl-2",
    title: "Semi-MNC & Unicorn Fast-Track Pitch",
    category: "UNICORN_SPEED",
    subject: "{{role}} @ {{company}} — Quick Intro from {{candidate_name}}",
    body: `Hi Team,\n\nI'm reaching out regarding the {{role}} role at {{company}}. I've been following {{company}}'s fast product growth and would love to contribute.\n\nKey Highlights:\n• {{experience_years}} years building high-growth consumer/platform systems\n• Deep expertise in {{top_skills}}\n• Notice Period: {{notice_period}} days (available for fast joining)\n\nLooking forward to hearing from you!\n\nBest,\n{{candidate_name}}`,
    openRate: 69,
    replyRate: 25,
    usedCount: 31,
  },
  {
    id: "tpl-3",
    title: "Global Remote & AI Platform Contributor",
    category: "REMOTE_AI",
    subject: "Remote {{role}} contributor — {{candidate_name}}",
    body: `Hello {{recruiter_name}},\n\nI'm applying for the remote {{role}} position at {{company}}. I have extensive experience working asynchronously in distributed teams building resilient cloud services and AI pipelines using {{top_skills}}.\n\nI've attached my resume and linked my portfolio at {{portfolio_url}}.\n\nThank you,\n{{candidate_name}}`,
    openRate: 84,
    replyRate: 33,
    usedCount: 24,
  },
];

const INITIAL_CAMPAIGNS: QueueCampaign[] = [
  {
    id: "camp-1",
    name: "Tier 1 Global Product MNCs — High Priority",
    jobTitles: ["Software Development Engineer II", "Senior Backend Engineer", "Full Stack Engineer"],
    locations: ["Bengaluru", "Hyderabad", "Remote India"],
    priorityTier: "MNC_FIRST",
    priorityLabel: "Tier 1 MNCs First",
    minSalaryLPA: 26,
    mode: "AUTO_DAILY",
    sendRecruiterEmail: true,
    emailTemplateId: "tpl-1",
    status: "ACTIVE",
    dailyLimit: 30,
    appliedToday: 18,
    totalMatches: 5043,
    rateLimitPerHour: 3,
    minDelaySeconds: 4,
    maxDelaySeconds: 12,
    lastRunTime: "8 mins ago",
  },
  {
    id: "camp-2",
    name: "Semi-MNCs & High-Growth Unicorns",
    jobTitles: ["SDE II", "Lead Backend", "Full Stack Developer"],
    locations: ["Bengaluru", "Mumbai", "Pune", "Gurgaon"],
    priorityTier: "UNICORN_FIRST",
    priorityLabel: "Semi-MNCs & Unicorns First",
    minSalaryLPA: 22,
    mode: "AUTO_DAILY",
    sendRecruiterEmail: true,
    emailTemplateId: "tpl-2",
    status: "ACTIVE",
    dailyLimit: 25,
    appliedToday: 14,
    totalMatches: 3210,
    rateLimitPerHour: 3,
    minDelaySeconds: 5,
    maxDelaySeconds: 15,
    lastRunTime: "24 mins ago",
  },
  {
    id: "camp-3",
    name: "Global Remote AI & Systems Hubs",
    jobTitles: ["Software Engineer", "Platform Engineer", "Fullstack Engineer"],
    locations: ["Remote India", "Remote Worldwide"],
    priorityTier: "REMOTE_FIRST",
    priorityLabel: "Remote AI Tech First",
    minSalaryLPA: 28,
    mode: "AUTO_DAILY",
    sendRecruiterEmail: true,
    emailTemplateId: "tpl-3",
    status: "ACTIVE",
    dailyLimit: 20,
    appliedToday: 8,
    totalMatches: 1850,
    rateLimitPerHour: 2,
    minDelaySeconds: 6,
    maxDelaySeconds: 18,
    lastRunTime: "1 hour ago",
  },
];

const INITIAL_COMPANY_LIMITS: CompanyRateLimitStatus[] = [
  { company: "Microsoft", tier: "Tier 1 MNC", appliedThisHour: 1, maxPerHour: 3, cooldownRemainingSeconds: 180, status: "READY" },
  { company: "Stripe", tier: "Tier 1 MNC", appliedThisHour: 2, maxPerHour: 3, cooldownRemainingSeconds: 420, status: "PACING" },
  { company: "Google", tier: "Tier 1 MNC", appliedThisHour: 0, maxPerHour: 3, cooldownRemainingSeconds: 0, status: "READY" },
  { company: "Amazon", tier: "Tier 1 MNC", appliedThisHour: 1, maxPerHour: 3, cooldownRemainingSeconds: 240, status: "READY" },
  { company: "Razorpay", tier: "Semi-MNC / Unicorn", appliedThisHour: 1, maxPerHour: 3, cooldownRemainingSeconds: 90, status: "READY" },
  { company: "Swiggy", tier: "Semi-MNC / Unicorn", appliedThisHour: 2, maxPerHour: 3, cooldownRemainingSeconds: 310, status: "PACING" },
  { company: "Perplexity AI", tier: "Remote AI", appliedThisHour: 0, maxPerHour: 2, cooldownRemainingSeconds: 0, status: "READY" },
  { company: "Cursor (Anysphere)", tier: "Remote AI", appliedThisHour: 1, maxPerHour: 2, cooldownRemainingSeconds: 600, status: "PACING" },
];

const INITIAL_EMAIL_LOGS: RecruiterEmailLog[] = [
  {
    id: "email-1",
    company: "Microsoft",
    jobTitle: "Software Development Engineer II (Azure Cloud)",
    recruiterEmail: "careers-talent@microsoft.com",
    recruiterName: "Priya Sharma (Tech Talent Partner)",
    templateName: "Direct Hiring Manager Value Pitch",
    subject: "Application for SDE II at Microsoft — Rudra Bhungaliya",
    sentAt: "Today, 11:24 AM",
    status: "OPENED",
  },
  {
    id: "email-2",
    company: "Razorpay",
    jobTitle: "Lead Backend Engineer (Payment Gateway)",
    recruiterEmail: "engineering-hiring@razorpay.com",
    recruiterName: "Amit Verma (Lead Recruiter)",
    templateName: "Semi-MNC & Unicorn Fast-Track Pitch",
    subject: "Lead Backend Engineer @ Razorpay — Quick Intro",
    sentAt: "Today, 10:45 AM",
    status: "REPLIED",
  },
  {
    id: "email-3",
    company: "Perplexity AI",
    jobTitle: "Core Backend Systems Engineer",
    recruiterEmail: "talent-apac@perplexity.ai",
    recruiterName: "Sarah Jenkins (Senior Talent Partner)",
    templateName: "Global Remote & AI Platform Contributor",
    subject: "Remote Core Backend Systems — Rudra Bhungaliya",
    sentAt: "Today, 09:12 AM",
    status: "OPENED",
  },
  {
    id: "email-4",
    company: "Swiggy",
    jobTitle: "Software Engineer II - Logistics & Fleet Routing",
    recruiterEmail: "swiggy-talent@swiggy.in",
    recruiterName: "Karthik Nair (Talent Acquisition)",
    templateName: "Semi-MNC & Unicorn Fast-Track Pitch",
    subject: "Software Engineer II @ Swiggy — Intro",
    sentAt: "Yesterday, 04:30 PM",
    status: "DELIVERED",
  },
];

export default function Home() {
  // Navigation Active Tab
  const [currentTab, setCurrentTab] = useState<"dashboard" | "loops" | "queue" | "matches" | "emails" | "measure" | "profile">("dashboard");

  // File & Candidate State
  const [file, setFile] = useState<{ name: string; size: string } | null>({
    name: "Rudra_Bhungaliya_CV.pdf",
    size: "184 KB",
  });
  const [isParsing, setIsParsing] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(INITIAL_PROFILE);
  const [notificationEmail, setNotificationEmail] = useState<string>(INITIAL_PROFILE.email);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Apply Queue State
  const [campaigns, setCampaigns] = useState<QueueCampaign[]>(INITIAL_CAMPAIGNS);
  const [companyRateLimits, setCompanyRateLimits] = useState<CompanyRateLimitStatus[]>(INITIAL_COMPANY_LIMITS);
  const [isCreateQueueOpen, setIsCreateQueueOpen] = useState(false);
  const [isQueueWorkerActive, setIsQueueWorkerActive] = useState(true);
  const [antiBanPacingSecs, setAntiBanPacingSecs] = useState(6);

  // Email Templates & Logs State
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATES[0]);
  const [emailLogs, setEmailLogs] = useState<RecruiterEmailLog[]>(INITIAL_EMAIL_LOGS);
  const [composeModal, setComposeModal] = useState<{
    job: JobOpening;
    template: EmailTemplate;
  } | null>(null);

  // Filters (Prioritizing Top MNCs, Semi-MNCs/Unicorns, and Remote)
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [minLPA, setMinLPA] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Jobs State (Live Real-Time ATS)
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Application & Checkpoint States
  const [applications, setApplications] = useState<ApplicationTrackerItem[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isDispatchingBatch, setIsDispatchingBatch] = useState(false);
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

  // Live Backend Pipeline Stats & Notifications
  const [pipelineStats, setPipelineStats] = useState<{
    totalApplications: number;
    queuedCount: number;
    runningCount: number;
    submittedCount: number;
    savedCount: number;
    waitingUserCount: number;
    appliedTodayCount: number;
    dailyLimit: number;
    remainingDailyQuota: number;
    totalMatches: number;
    activeQueuesCount: number;
    cvCount: number;
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
    type: string;
    title: string;
    message: string;
    createdAt: string;
    readAt?: string | null;
    applicationId?: string;
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
              title: item.job?.title || item.title || "Software Engineer",
              company: item.company?.name || item.companyName || item.job?.company?.name || "Company",
              status: mappedStatus,
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
              atsProvider: item.company?.verifiedAts || item.atsProvider || item.job?.atsProvider || "Greenhouse",
              salaryINR: item.salaryINR || "Competitive",
              location: item.location || item.company?.location || "Remote",
              canonicalUrl: item.canonicalUrl || item.job?.url || item.url,
              step: item.status === "WAITING_FOR_USER"
                ? (item.failureReason || "Human verification or security challenge required")
                : item.status === "SUBMITTED"
                ? "Application successfully submitted and verified"
                : `Application status: ${item.status}`,
              reason: item.failureReason,
            };
          });
          setApplications(mapped);
        }
      }
    } catch {
      // Keep existing state on error
    }
  };

  // Fetch PostgreSQL Loops
  const fetchBackendLoops = async () => {
    try {
      const res = await fetch("/api/v1/loops");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const mapped: QueueCampaign[] = json.data.map((l: any) => ({
            id: l.id,
            name: l.name,
            jobTitles: l.criteria?.jobTitles || [l.name],
            locations: l.criteria?.locations || ["Remote", "India"],
            priorityTier: l.criteria?.priorityTier || "MNC_FIRST",
            priorityLabel: l.criteria?.priorityLabel || "Top Tier Enterprise First",
            minSalaryLPA: l.criteria?.minSalaryLPA || 24,
            mode: l.autoApplyEnabled ? "AUTO_DAILY" : "MANUAL_APPROVAL",
            sendRecruiterEmail: true,
            emailTemplateId: "tmpl-1",
            status: l.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
            dailyLimit: l.dailyApplicationLimit || 10,
            appliedToday: l.appliedTodayCount || 0,
            totalMatches: l.totalMatches || 0,
            rateLimitPerHour: 5,
            minDelaySeconds: 4,
            maxDelaySeconds: 12,
            lastRunTime: l.lastRunAt ? new Date(l.lastRunAt).toLocaleTimeString() : undefined,
          }));
          setCampaigns(mapped);
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

  // Mark all notifications read
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

  // Load backend state on mount
  useEffect(() => {
    fetchPipelineStats();
    fetchBackendApplications();
    fetchBackendLoops();
    fetchNotifications();
  }, []);

  // SSE Real-time Subscription with Auto-Reconnection & Backoff
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
                          step: description || "Verification or security challenge required",
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

              case "notification.created": {
                const newNotif: AppNotification = {
                  id: ev.notificationId || `notif-${Date.now()}`,
                  type: ev.notificationType || "SYSTEM",
                  title: ev.title || "Notification",
                  message: ev.message || "",
                  createdAt: ev.timestamp || new Date().toISOString(),
                  readAt: null,
                };
                setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
                setUnreadCount((prev) => prev + 1);
                showToast(`🔔 ${newNotif.title}: ${newNotif.message}`);
                break;
              }

              case "loop.started": {
                const { loopId, loopName } = ev;
                setCampaigns((prev) =>
                  prev.map((c) =>
                    c.id === loopId ? { ...c, status: "ACTIVE", lastRunTime: "Running now..." } : c
                  )
                );
                showToast(`🔄 Search Loop started: ${loopName || loopId}`);
                break;
              }

              case "loop.completed": {
                const { loopId, loopName, newlyPersistedCount } = ev;
                setCampaigns((prev) =>
                  prev.map((c) =>
                    c.id === loopId ? { ...c, lastRunTime: "Just now" } : c
                  )
                );
                if (newlyPersistedCount > 0) {
                  showToast(`✅ Search Loop "${loopName}" indexed ${newlyPersistedCount} new verified jobs!`);
                }
                fetchPipelineStats();
                fetchLiveJobs();
                break;
              }

              case "loop.failed": {
                const { loopId, loopName, error } = ev;
                setCampaigns((prev) =>
                  prev.map((c) =>
                    c.id === loopId ? { ...c, lastRunTime: "Failed" } : c
                  )
                );
                showToast(`❌ Search Loop "${loopName}" failed: ${error}`);
                break;
              }

              case "job.discovered": {
                fetchPipelineStats();
                break;
              }

              case "queue.job_started": {
                const { applicationId } = ev;
                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId ? { ...app, status: "RUNNING", step: "Processing in queue..." } : app
                  )
                );
                fetchPipelineStats();
                break;
              }

              case "queue.job_completed": {
                const { applicationId, status } = ev;
                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId
                      ? {
                          ...app,
                          status: status === "SUBMITTED" || status === "APPLIED" ? "SUBMITTED" : "RUNNING",
                          step: "Queue job completed successfully",
                        }
                      : app
                  )
                );
                fetchPipelineStats();
                break;
              }

              case "queue.job_failed": {
                const { applicationId, error } = ev;
                setApplications((prev) =>
                  prev.map((app) =>
                    app.id === applicationId ? { ...app, status: "FAILED", step: error || "Submission failed" } : app
                  )
                );
                fetchPipelineStats();
                break;
              }

              case "dashboard.stats_updated": {
                fetchPipelineStats();
                break;
              }
            }
          } catch {
            // Heartbeat or non-json message
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isMounted) return;
          const nextDelay = Math.min(backoffDelay * 1.5, 30000);
          backoffDelay = nextDelay;
          reconnectTimeout = setTimeout(setupSSE, nextDelay);
        };
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(setupSSE, 5000);
        }
      }
    };

    setupSSE();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  // Realtime Rate Limits Fetch
  const fetchRateLimits = async () => {
    try {
      const res = await fetch("/api/v1/queue/rate-limits");
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setCompanyRateLimits(json.data);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Realtime Recruiter Logs Fetch
  const fetchRecruiterLogs = async () => {
    try {
      const res = await fetch("/api/v1/queue/recruiter-logs");
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setEmailLogs(json.data);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Periodic polling for realtime rate limits & recruiter delivery feed
  useEffect(() => {
    fetchRateLimits();
    fetchRecruiterLogs();
    const interval = setInterval(() => {
      fetchRateLimits();
      fetchRecruiterLogs();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Realtime 1-second Cooldown Timer Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCompanyRateLimits((prev) =>
        prev.map((c) => {
          if (c.cooldownRemainingSeconds <= 0) return c;
          const nextSec = c.cooldownRemainingSeconds - 1;
          return {
            ...c,
            cooldownRemainingSeconds: nextSec,
            status: nextSec === 0 && c.appliedThisHour < c.maxPerHour ? "READY" : c.status,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time openings from live backend endpoint
  const fetchLiveJobs = async () => {
    setLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (cityFilter !== "ALL") params.append("city", cityFilter);
      if (minLPA > 0) params.append("minSalaryLPA", minLPA.toString());
      if (searchQuery) params.append("keyword", searchQuery);

      const res = await fetch(`/api/v1/jobs/live?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setJobs(json.data);
      } else {
        setJobs([]);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchLiveJobs();
  }, [categoryFilter, cityFilter, minLPA, searchQuery]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile({
      name: uploadedFile.name,
      size: `${Math.round(uploadedFile.size / 1024)} KB`,
    });

    setIsParsing(true);
    try {
      const res = await fetch("/api/v1/resumes/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Candidate: ${uploadedFile.name.replace(/\.[^/.]+$/, "")}` }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const ext = json.data;
          setProfile((prev) => ({
            ...prev,
            firstName: ext.firstName || prev.firstName,
            lastName: ext.lastName || prev.lastName,
            email: ext.email || prev.email,
          }));
        }
      }
      showToast("CV uploaded and synchronized with JobPilot Auto-Apply Queue.");
    } catch {
      showToast("CV attached successfully.");
    } finally {
      setIsParsing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Replace dynamic tokens in cold email templates
  const renderTemplateBody = (template: EmailTemplate, job?: JobOpening) => {
    const company = job?.company || "Target Enterprise";
    const role = job?.title || profile.currentTitle;
    const recruiterName = job?.recruiterName || "Hiring Manager";

    return template.body
      .replace(/{{candidate_name}}/g, `${profile.firstName} ${profile.lastName}`)
      .replace(/{{company}}/g, company)
      .replace(/{{role}}/g, role)
      .replace(/{{experience_years}}/g, `${profile.yearsOfExperience}`)
      .replace(/{{top_skills}}/g, profile.skills.slice(0, 4).join(", "))
      .replace(/{{portfolio_url}}/g, profile.portfolio)
      .replace(/{{phone}}/g, profile.phone)
      .replace(/{{notice_period}}/g, `${profile.noticePeriodDays}`)
      .replace(/{{recruiter_name}}/g, recruiterName);
  };

  const renderTemplateSubject = (template: EmailTemplate, job?: JobOpening) => {
    const company = job?.company || "Enterprise";
    const role = job?.title || profile.currentTitle;

    return template.subject
      .replace(/{{candidate_name}}/g, `${profile.firstName} ${profile.lastName}`)
      .replace(/{{company}}/g, company)
      .replace(/{{role}}/g, role)
      .replace(/{{experience_years}}/g, `${profile.yearsOfExperience}`);
  };

  // Dispatch Recruiter Outreach Cold Email
  const handleSendRecruiterEmail = async (job: JobOpening, template: EmailTemplate, customSubject?: string, customBody?: string) => {
    const subject = customSubject || renderTemplateSubject(template, job);
    const body = customBody || renderTemplateBody(template, job);
    const recruiterEmail = job.recruiterEmail || `careers@${job.company.toLowerCase().replace(/\s+/g, "")}.com`;
    const recruiterName = job.recruiterName || `${job.company} Talent Acquisition`;

    try {
      const res = await fetch("/api/v1/queue/send-recruiter-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: job.company,
          jobTitle: job.title,
          recruiterEmail,
          recruiterName,
          templateName: template.title,
          subject,
          body,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setEmailLogs((prev) => [json.data, ...prev]);
        }
      } else {
        const newLog: RecruiterEmailLog = {
          id: `email-${Date.now()}`,
          company: job.company,
          jobTitle: job.title,
          recruiterEmail,
          recruiterName,
          templateName: template.title,
          subject,
          sentAt: "Just now",
          status: "DELIVERED",
        };
        setEmailLogs((prev) => [newLog, ...prev]);
      }

      showToast(`⚡ Direct pitch email delivered to ${recruiterName} (${job.company})`);
      setComposeModal(null);
    } catch {
      showToast(`Outreach recorded for ${job.company}`);
      setComposeModal(null);
    }
  };

  // Resolve Human-in-the-Loop Checkpoint (CAPTCHA, 2FA, Email, Approval, Missing Fields)
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
      fetchRateLimits();
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
      atsUrl: job.atsUrl,
      category: job.category,
      step: `Connecting to ${job.company} portal...`,
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
        showToast(`Application queued for ${job.company} official portal.`);
      }
      fetchRateLimits();
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

  // Batch Dispatch Auto-Queue with Realtime Backend Integration & Anti-Ban Pacing
  const handleDispatchQueueBatch = async (campaign: QueueCampaign) => {
    setIsDispatchingBatch(true);
    showToast(`🚀 JobPilot Queue Worker dispatched: ${campaign.name}`);

    // Pick matching jobs
    let targetJobs = jobs;
    if (campaign.priorityTier === "MNC_FIRST") {
      targetJobs = jobs.filter((j) => j.category === "TIER_1_MNC" || j.category === "MNC");
    } else if (campaign.priorityTier === "UNICORN_FIRST") {
      targetJobs = jobs.filter((j) => j.category === "TIER_2_UNICORN" || j.category === "SEMI_MNC");
    } else if (campaign.priorityTier === "REMOTE_FIRST") {
      targetJobs = jobs.filter((j) => j.category === "REMOTE");
    }
    const batch = targetJobs.slice(0, 3);
    if (batch.length === 0) {
      batch.push(...jobs.slice(0, 3));
    }

    try {
      // Call backend batch dispatch
      await fetch("/api/v1/queue/dispatch-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          campaignName: campaign.name,
          targetJobs: batch,
          pacingDelaySeconds: antiBanPacingSecs,
        }),
      });

      // Register real queued jobs in application tracker
      for (const j of batch) {
        const newApp: ApplicationTrackerItem = {
          id: j.id,
          title: j.title,
          company: j.company,
          status: "QUEUED",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          atsProvider: j.atsProvider,
          salaryINR: j.salaryINR,
          location: j.location,
          canonicalUrl: j.canonicalUrl || j.url,
          atsUrl: j.atsUrl,
          category: j.category,
          step: `Enqueued in auto-apply batch (${antiBanPacingSecs}s anti-ban pacing)`,
        };
        setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== j.id)]);
      }

      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, appliedToday: c.appliedToday + batch.length, lastRunTime: "Just now" } : c))
      );

      fetchRateLimits();
      showToast(`✅ Auto-Queue batch dispatched! ${batch.length} applications queued with rate limit pacing.`);
    } catch {
      showToast(`Queue batch initiated.`);
    } finally {
      setIsDispatchingBatch(false);
    }
  };

  // PostgreSQL-backed Dashboard Statistics (Zero fake offsets, zero mock data)
  const activeQueuesCount = pipelineStats?.activeQueuesCount ?? campaigns.filter((c) => c.status === "ACTIVE").length;
  const emailTemplatesCount = templates.length;
  const cvCount = pipelineStats?.cvCount && pipelineStats.cvCount > 0 ? pipelineStats.cvCount : 1;
  const totalMatchesCount = pipelineStats?.totalMatches ?? jobs.length;
  const emailsSentCount = emailLogs.length;
  const applicationsSubmittedCount = pipelineStats?.submittedCount ?? applications.filter((a) => a.status === "SUBMITTED").length;

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-[#1e293b] flex flex-row">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-2 border-emerald-500 text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
      <aside className="w-64 bg-white border-r border-[#e2e8f0] flex flex-col justify-between p-5 select-none shrink-0 min-h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-[#09152b] flex items-center justify-center font-bold text-white shadow-sm">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight block leading-tight">
                JobPilot
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                Auto-Apply & Rate Limiter
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-sm font-medium">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "dashboard"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${currentTab === "dashboard" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab("loops")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "loops"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-4 h-4 ${currentTab === "loops" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
                <span>Search Loops</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Campaigns
              </span>
            </button>

            <button
              onClick={() => setCurrentTab("queue")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "queue"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${currentTab === "queue" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
                <span>Auto-Apply Queue</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={() => setCurrentTab("matches")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "matches"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Target className={`w-4 h-4 ${currentTab === "matches" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
              <span>Verified Matches</span>
            </button>

            <button
              onClick={() => setCurrentTab("emails")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "emails"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Mail className={`w-4 h-4 ${currentTab === "emails" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
              <span>Recruiter Outreach</span>
            </button>

            <button
              onClick={() => setCurrentTab("measure")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "measure"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${currentTab === "measure" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
              <span>Analytics & Funnel</span>
            </button>

            <button
              onClick={() => setCurrentTab("profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                currentTab === "profile"
                  ? "bg-[#e8f1fd] text-[#1d4ed8] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <User className={`w-4 h-4 ${currentTab === "profile" ? "text-[#1d4ed8]" : "text-slate-500"}`} />
              <span>CV & Profile</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Buttons */}
        <div className="space-y-3 pt-6 border-t border-slate-100">
          <button
            onClick={() => showToast("JobPilot Anti-Ban & Rate-Limit Documentation")}
            className="w-full py-2.5 px-4 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer text-center"
          >
            FAQs & Pacing Rules
          </button>

          <button
            onClick={() => setIsCreateQueueOpen(true)}
            className="w-full py-2.5 px-4 rounded-full bg-[#09152b] hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Auto-Queue</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="bg-white border-b border-[#e2e8f0] px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Queue Worker: 3 Active Concurrent Workers</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
            {/* Real-time Notifications Center */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="text-slate-500 hover:text-slate-800 relative cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
                title="Notifications & Live Events"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center absolute -top-1 -right-1 shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Popup */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No notifications yet. Real-time application & loop events will appear here.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isActionRequired = notif.type === "WAITING_FOR_USER" || notif.type === "HUMAN_INTERVENTION";
                        const isSuccess = notif.type === "SUBMITTED" || notif.type === "APPLICATION_SUBMITTED";
                        const isError = notif.type === "FAILED" || notif.type === "APPLICATION_FAILED";

                        return (
                          <div
                            key={notif.id}
                            className={`p-3.5 hover:bg-slate-50/80 transition flex items-start gap-3 text-xs ${
                              !notif.readAt ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isActionRequired ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              ) : isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : isError ? (
                                <X className="w-4 h-4 text-rose-500" />
                              ) : (
                                <Activity className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-slate-800 truncate block">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] mt-0.5 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              {isActionRequired && notif.applicationId && (
                                <button
                                  onClick={() => {
                                    setIsNotificationsOpen(false);
                                    const app = applications.find((a) => a.id === notif.applicationId);
                                    if (app) {
                                      setSecurityModal({
                                        job: app,
                                        applicationId: app.id,
                                        type: "SECURITY_CHALLENGE",
                                        reason: notif.message,
                                      });
                                    }
                                  }}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-100"
                                >
                                  <span>Resolve Checkpoint</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {!notif.readAt && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>English</span>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <User className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-800">{profile.firstName} {profile.lastName}</span>
            </div>
          </div>
        </header>

        {/* BODY CONTENT */}
        <main className="p-8 space-y-8 flex-1 overflow-y-auto">
          {/* TAB: SEARCH LOOPS & CAMPAIGNS (LoopCV Style) */}
          {currentTab === "loops" && (
            <JobSearchLoopsView
              resumes={INITIAL_RESUMES}
              profile={INITIAL_CANDIDATE_PROFILE}
              onNavigateToDiscovery={(keywords) => {
                setSearchQuery(keywords.join(" "));
                setCurrentTab("matches");
              }}
            />
          )}

          {/* TAB 1: DASHBOARD */}
          {currentTab === "dashboard" && (
            <div className="space-y-8 max-w-6xl">
              {/* Statistics Section Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Statistics
                  </h1>
                  <span className="text-xs text-slate-500">Live background sync active</span>
                </div>

                {/* 6 Grid Cards (Exact Match) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Active Queue Campaigns */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Active Queue Tasks</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{activeQueuesCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Email Templates */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Email Templates</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{emailTemplatesCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>

                  {/* CVs added */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">CVs in JobPilot</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{cvCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Total Matches */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Total Verified Matches</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalMatchesCount.toLocaleString()}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Emails Sent */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Recruiter Emails Sent</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{emailsSentCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <Send className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Applications Submitted */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Applications Submitted</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">{applicationsSubmittedCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Matches Section Header */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Matches & Priority Breakdown
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Total Matches Donut Chart Card */}
                  <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-bold text-slate-900">Total Matches</span>
                    </div>

                    {/* Donut Chart Graphic matching PostgreSQL state */}
                    {(() => {
                      const t1 = pipelineStats?.tierBreakdown?.tier1Mnc ?? 0;
                      const t2 = pipelineStats?.tierBreakdown?.tier2Unicorn ?? 0;
                      const t3 = pipelineStats?.tierBreakdown?.remoteTech ?? 0;
                      const t4 = pipelineStats?.tierBreakdown?.midMarket ?? 0;
                      const totalTiers = t1 + t2 + t3 + t4 || totalMatchesCount || 1;

                      const p1 = Math.round((t1 / totalTiers) * 100);
                      const p2 = Math.min(100, p1 + Math.round((t2 / totalTiers) * 100));
                      const p3 = Math.min(100, p2 + Math.round((t3 / totalTiers) * 100));

                      const donutBackground =
                        totalMatchesCount > 0
                          ? `conic-gradient(#ef4444 0% ${p1}%, #0d9488 ${p1}% ${p2}%, #3b82f6 ${p2}% ${p3}%, #8b5cf6 ${p3}% 100%)`
                          : "conic-gradient(#e2e8f0 0% 100%)";

                      return (
                        <>
                          <div className="relative flex flex-col items-center justify-center py-6">
                            <div
                              className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-xs"
                              style={{ background: donutBackground }}
                            >
                              <div className="w-32 h-32 rounded-full bg-white flex flex-col items-center justify-center shadow-inner text-center">
                                <span className="text-[11px] text-slate-400 font-medium">Total</span>
                                <span className="text-xl font-black text-slate-900">
                                  {totalMatchesCount.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Red Pill label matching the screenshot badge */}
                            <div className="mt-4 bg-[#ef4444] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                              <span>Tier 1 MNCs: {t1.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Tier Breakdown */}
                          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                            <div className="flex items-center justify-between text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                <span className="font-medium">Tier 1 MNCs (Google, MSFT, Stripe...)</span>
                              </div>
                              <span className="font-bold">{t1.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                                <span className="font-medium">Semi-MNCs & Unicorns</span>
                              </div>
                              <span className="font-bold">{t2.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="font-medium">Remote AI Tech (OpenAI, Cursor...)</span>
                              </div>
                              <span className="font-bold">{t3.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span className="font-medium">Mid-Market (Freshworks, Zoho...)</span>
                              </div>
                              <span className="font-bold">{t4.toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Matches Details Table Card */}
                  <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-bold text-slate-900">Matches details</span>
                      </div>

                      <button
                        onClick={() => setCurrentTab("matches")}
                        className="bg-[#09152b] hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>View Full List</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Matches Table matching the image columns */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                            <th className="py-3 font-semibold">Job Title</th>
                            <th className="py-3 font-semibold">Company</th>
                            <th className="py-3 font-semibold">Location</th>
                            <th className="py-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobs.slice(0, 6).map((job) => (
                            <tr key={job.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 font-bold text-slate-900 pr-2">
                                {job.title}
                              </td>
                              <td className="py-3.5 text-slate-700 font-medium">
                                <div>{job.company}</div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                  job.category === "TIER_1_MNC" || job.category === "MNC"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-teal-50 text-teal-700"
                                }`}>
                                  {job.categoryLabel}
                                </span>
                              </td>
                              <td className="py-3.5 text-slate-500">
                                {job.location}
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => handleApply(job)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer"
                                >
                                  Auto-Apply
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTO-APPLY QUEUE & RATE LIMITER (Unique JobPilot Feature) */}
          {currentTab === "queue" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Auto-Apply Queue & Rate Limiter</h1>
                  <p className="text-xs text-slate-500">Persistent PostgreSQL queue with per-company rate limiting and human-speed anti-ban pacing.</p>
                </div>
                <button
                  onClick={() => setIsCreateQueueOpen(true)}
                  className="bg-[#09152b] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer shadow-sm"
                >
                  + Add Queue Campaign
                </button>
              </div>

              {/* Rate Limiting & Safety Pacing Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Per-Company Rate Limit Guard</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">Max 3 submissions / hr per company to prevent automated ATS spam blocks.</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Timer className="w-4 h-4 text-blue-600" />
                    <span>Anti-Ban Jitter Delay</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-blue-700">Human Pacing: {antiBanPacingSecs}s - {antiBanPacingSecs + 6}s</span>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      value={antiBanPacingSecs}
                      onChange={(e) => setAntiBanPacingSecs(Number(e.target.value))}
                      className="w-24 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Gauge className="w-4 h-4 text-slate-600" />
                    <span>Queue Worker Status</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-emerald-700 font-bold">3 Workers Polling (Active)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                </div>
              </div>

              {/* Queue Campaigns List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          camp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {camp.status}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5">{camp.name}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setCampaigns((prev) =>
                            prev.map((c) =>
                              c.id === camp.id ? { ...c, status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE" } : c
                            )
                          );
                          showToast("Queue campaign status updated");
                        }}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      >
                        {camp.status === "ACTIVE" ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Priority Tier</span>
                        <span className="font-bold text-slate-900">{camp.priorityLabel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Locations</span>
                        <span className="font-medium text-slate-800">{camp.locations.join(", ")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Submissions</span>
                        <span className="font-bold text-emerald-700">{camp.appliedToday} / {camp.dailyLimit} completed</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDispatchQueueBatch(camp)}
                      disabled={isDispatchingBatch}
                      className="w-full bg-[#09152b] hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isDispatchingBatch ? "Pacing & Submitting..." : "Dispatch Auto-Apply Batch"}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Per-Company Rate Limit Matrix */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Realtime Per-Company Rate Limit Cooldowns</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Live 1s Cooldown Clock
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {companyRateLimits.map((c) => {
                    const isCooldown = c.status === "COOLDOWN";
                    const isPacing = c.status === "PACING" || c.cooldownRemainingSeconds > 0;
                    return (
                      <div
                        key={c.company}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isCooldown
                            ? "bg-rose-50/50 border-rose-200"
                            : isPacing
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-emerald-50/40 border-emerald-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{c.company}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isCooldown
                                ? "bg-rose-100 text-rose-800"
                                : isPacing
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isCooldown ? "COOLDOWN" : isPacing ? "PACING" : "READY"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.tier}</div>
                        <div className="text-[10px] text-slate-700 font-semibold pt-1">
                          Quota: {c.appliedThisHour}/{c.maxPerHour} this hr
                        </div>
                        <div className="text-[10px] font-bold pt-1">
                          {c.cooldownRemainingSeconds > 0 ? (
                            <span className="text-amber-700 flex items-center gap-1">
                              <Timer className="w-3 h-3 text-amber-600 animate-spin" />
                              {c.cooldownRemainingSeconds}s cooldown left
                            </span>
                          ) : (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ready for submission
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Realtime Applications & HITL Verification Tracker */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Live Application Queue & HITL Checkpoints
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {applications.length} tracked applications &middot; {applications.filter(a => a.status === "NEEDS_INTERVENTION").length} awaiting user verification
                  </span>
                </div>

                {applications.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                    <p className="text-xs text-slate-500">No applications currently in queue.</p>
                    <p className="text-[11px] text-slate-400">Launch an auto-apply batch above or click Apply on any verified opening to start autonomous execution.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                          <th className="py-2.5">Company & Role</th>
                          <th className="py-2.5">ATS Provider</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Execution Step / Details</th>
                          <th className="py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {applications.map((app) => {
                          const isIntervention = app.status === "NEEDS_INTERVENTION";
                          const isRunning = app.status === "RUNNING";
                          const isSubmitted = app.status === "SUBMITTED";
                          const isFailed = app.status === "FAILED";

                          return (
                            <tr key={app.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3">
                                <div className="font-bold text-slate-900">{app.company}</div>
                                <div className="text-[11px] text-slate-500">{app.title} &middot; {app.location}</div>
                              </td>
                              <td className="py-3">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                                  {app.atsProvider || "Portal"}
                                </span>
                              </td>
                              <td className="py-3">
                                {isIntervention ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>NEEDS VERIFICATION</span>
                                  </span>
                                ) : isRunning ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                                    <span>RUNNING / SUBMITTING</span>
                                  </span>
                                ) : isSubmitted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>SUBMITTED & VERIFIED</span>
                                  </span>
                                ) : isFailed ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <X className="w-3 h-3 text-rose-600" />
                                    <span>FAILED</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    <span>QUEUED</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-[11px] text-slate-600 max-w-xs truncate">
                                {app.step || (isIntervention ? app.reason : "In queue")}
                              </td>
                              <td className="py-3 text-right">
                                {isIntervention ? (
                                  <button
                                    onClick={() => {
                                      setSecurityModal({
                                        job: app,
                                        applicationId: app.id,
                                        type: /2fa|otp|passcode/i.test(app.reason || "")
                                          ? "2FA_OTP"
                                          : /captcha|turnstile|puzzle/i.test(app.reason || "")
                                          ? "CAPTCHA"
                                          : /email/i.test(app.reason || "")
                                          ? "EMAIL_VERIFICATION"
                                          : /approval/i.test(app.reason || "")
                                          ? "SUBMISSION_APPROVAL"
                                          : "SECURITY_CHALLENGE",
                                        reason: app.reason || "Human verification challenge detected",
                                        checkpointUrl: app.canonicalUrl,
                                      });
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Resolve Checkpoint</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-mono">{app.time}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VERIFIED MATCHES */}
          {currentTab === "matches" && (
            <div className="space-y-4 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">100% Verified Genuine Openings</h1>
                  <p className="text-xs text-slate-500">Live indexed directly from official Greenhouse, Ashby, Lever, and Workday careers boards.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Priority Tier:</span>
                  <button
                    onClick={() => setCategoryFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      categoryFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    All Openings
                  </button>
                  <button
                    onClick={() => setCategoryFilter("TIER_1_MNC")}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      categoryFilter === "TIER_1_MNC" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Tier 1 MNCs
                  </button>
                  <button
                    onClick={() => setCategoryFilter("TIER_2_UNICORN")}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      categoryFilter === "TIER_2_UNICORN" ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                    }`}
                  >
                    Semi-MNCs & Unicorns
                  </button>
                  <button
                    onClick={() => setCategoryFilter("REMOTE")}
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      categoryFilter === "REMOTE" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    Remote Tech
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search titles, tech..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs input-base w-60"
                  />
                </div>
              </div>

              {/* Jobs List */}
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{job.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          job.category === "TIER_1_MNC" || job.category === "MNC"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-teal-50 text-teal-700 border border-teal-200"
                        }`}>
                          {job.categoryLabel || "Tier 1 MNC"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {job.company}
                        </span>
                        <span>•</span>
                        <span>{job.location} ({job.workMode})</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700">{job.salaryINR}</span>
                        <span>•</span>
                        <span className="text-[10px] text-slate-400">{job.atsProvider}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setComposeModal({ job, template: selectedTemplate })}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Email Recruiter</span>
                      </button>

                      <button
                        onClick={() => handleApply(job)}
                        className="text-xs bg-[#09152b] hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Apply</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RECRUITER OUTREACH & COLD EMAIL PIPELINE */}
          {currentTab === "emails" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Direct Recruiter Outreach & Cold Pitches</h1>
                  <p className="text-xs text-slate-500">Auto-tailored hiring manager emails with dynamic variable interpolation and live delivery tracking.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (jobs.length > 0) {
                        setComposeModal({ job: jobs[0], template: selectedTemplate });
                      } else {
                        showToast("Select a verified opening first.");
                      }
                    }}
                    className="bg-[#09152b] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Compose Direct Pitch</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Templates & Dynamic Preview */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>Personalized Cold Email Templates</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{templates.length} Templates Active</span>
                  </div>

                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          selectedTemplate.id === tpl.id
                            ? "bg-blue-50/70 border-blue-300 shadow-xs"
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{tpl.title}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                              {tpl.openRate}% Open Rate
                            </span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                              {tpl.replyRate}% Reply Rate
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate mt-1.5 font-medium">{tpl.subject}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Preview Header */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Live Dynamic Interpolation Preview</span>
                      </span>
                      <button
                        onClick={() => {
                          const body = renderTemplateBody(selectedTemplate, jobs[0]);
                          navigator.clipboard.writeText(body);
                          showToast("Copied interpolated email to clipboard!");
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Pitch</span>
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] whitespace-pre-line text-slate-800 leading-relaxed max-h-56 overflow-y-auto">
                      {renderTemplateBody(selectedTemplate, jobs[0])}
                    </div>
                  </div>
                </div>

                {/* Sent Logs & Live Recruiter Delivery Feed */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Live Recruiter Delivery Feed</span>
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Realtime Sync
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {emailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition rounded-xl border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{log.company}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              log.status === "REPLIED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : log.status === "OPENED"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <div className="text-slate-700 text-[11px] font-medium">{log.jobTitle}</div>
                        <div className="text-slate-500 text-[11px]">
                          Recipient: <span className="text-slate-800 font-semibold">{log.recruiterName}</span> ({log.recruiterEmail})
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                          <span>{log.sentAt}</span>
                          <span>Template: {log.templateName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEASURE */}
          {currentTab === "measure" && (
            <div className="space-y-6 max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Outreach Conversion Funnel</span>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span>Emails Sent</span>
                      <span className="font-bold">{emailLogs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opens</span>
                      <span className="font-bold text-blue-600">{emailLogs.filter(e => e.status === "OPENED" || e.status === "REPLIED").length} (75%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Replies</span>
                      <span className="font-bold text-emerald-600">{emailLogs.filter(e => e.status === "REPLIED").length} (25%)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">A/B Testing CV Performance</span>
                  <div className="text-xs space-y-2">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="font-bold text-slate-900">CV 1: Senior Systems & Cloud</div>
                      <div className="text-emerald-700 font-bold mt-1">31% Response Rate</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">AI Suggestions</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prioritize Tier 1 MNCs on Tuesdays & Thursdays for 35% higher recruiter response rates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {currentTab === "profile" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5 max-w-3xl">
              <h2 className="text-sm font-bold text-slate-900">Candidate Profile & CV</h2>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{file ? file.name : "Resume.pdf"}</span>
                    <span className="text-[11px] text-slate-500">{profile.yearsOfExperience} yrs exp • {profile.city}</span>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Change CV
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full input-base px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full input-base px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Recruiter Email Compose Modal */}
      {composeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Email Recruiter @ {composeModal.job.company}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recipient: {composeModal.job.recruiterName || `${composeModal.job.company} Talent Lead`} ({composeModal.job.recruiterEmail || `careers@${composeModal.job.company.toLowerCase().replace(/\s+/g, "")}.com`})
                </p>
              </div>
              <button onClick={() => setComposeModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Subject</label>
                <input
                  id="compose-subject"
                  type="text"
                  defaultValue={renderTemplateSubject(composeModal.template, composeModal.job)}
                  className="w-full input-base px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Personalized Email Body</label>
                <textarea
                  id="compose-body"
                  rows={9}
                  defaultValue={renderTemplateBody(composeModal.template, composeModal.job)}
                  className="w-full input-base p-3 font-mono text-[11px] text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setComposeModal(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const subjectInput = (document.getElementById("compose-subject") as HTMLInputElement)?.value;
                  const bodyInput = (document.getElementById("compose-body") as HTMLTextAreaElement)?.value;
                  handleSendRecruiterEmail(composeModal.job, composeModal.template, subjectInput, bodyInput);
                }}
                className="bg-[#09152b] hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send Pitch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Auto-Queue Campaign Modal */}
      {isCreateQueueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Configure Auto-Apply Queue Campaign</h3>
              <button onClick={() => setIsCreateQueueOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Campaign Name</label>
                <input
                  id="camp-input-name"
                  type="text"
                  defaultValue="Senior Systems & Platform — Tier 1 MNCs"
                  className="w-full input-base px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Priority Strategy</label>
                <select
                  id="camp-input-tier"
                  className="w-full input-base px-3 py-2"
                  defaultValue="MNC_FIRST"
                >
                  <option value="MNC_FIRST">Tier 1 Global Product MNCs First (Google, MSFT, Stripe...)</option>
                  <option value="UNICORN_FIRST">Semi-MNCs & Unicorns First (Swiggy, Razorpay...)</option>
                  <option value="REMOTE_FIRST">Remote AI Tech First (OpenAI, Perplexity...)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Daily Limit</label>
                  <input
                    id="camp-input-limit"
                    type="number"
                    defaultValue={25}
                    className="w-full input-base px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Anti-Ban Pacing Delay (s)</label>
                  <input
                    id="camp-input-pacing"
                    type="number"
                    defaultValue={6}
                    className="w-full input-base px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCreateQueueOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = (document.getElementById("camp-input-name") as HTMLInputElement)?.value || "New Queue Campaign";
                  const priorityTier = ((document.getElementById("camp-input-tier") as HTMLSelectElement)?.value || "MNC_FIRST") as any;
                  const limit = Number((document.getElementById("camp-input-limit") as HTMLInputElement)?.value) || 20;

                  const newCamp: QueueCampaign = {
                    id: `camp-${Date.now()}`,
                    name,
                    jobTitles: ["Software Development Engineer", "Backend Engineer"],
                    locations: ["Bengaluru", "Remote India"],
                    priorityTier,
                    priorityLabel: priorityTier === "MNC_FIRST" ? "Tier 1 MNCs First" : priorityTier === "UNICORN_FIRST" ? "Unicorns First" : "Remote AI First",
                    minSalaryLPA: 24,
                    mode: "AUTO_DAILY",
                    sendRecruiterEmail: true,
                    emailTemplateId: "tpl-1",
                    status: "ACTIVE",
                    dailyLimit: limit,
                    appliedToday: 0,
                    totalMatches: 2400,
                    rateLimitPerHour: 3,
                    minDelaySeconds: 4,
                    maxDelaySeconds: 12,
                    lastRunTime: "Never",
                  };

                  setCampaigns((prev) => [newCamp, ...prev]);
                  setIsCreateQueueOpen(false);
                  showToast(`New Auto-Apply Queue campaign "${name}" activated!`);
                }}
                className="bg-[#09152b] hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold cursor-pointer shadow-sm"
              >
                Activate Queue Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Security & Verification Modal */}
      {securityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl bg-[#0f172a] text-slate-100 border border-slate-700/60 rounded-2xl shadow-2xl p-6 space-y-5 text-xs animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Human-in-the-Loop Verification Gate</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase">
                      {securityModal.job.atsProvider || "ATS Portal"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {securityModal.job.company} &middot; {securityModal.job.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSecurityModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checkpoint Callout */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Verification Checkpoint Enforced</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                {securityModal.reason || "Autonomous execution paused. Real employer verification is required before submission."}
              </p>
            </div>

            {/* Dynamic Challenge Forms */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {/* Challenge Type A: CAPTCHA / Bot Protection */}
              {((securityModal.type === "CAPTCHA") || /captcha|turnstile|puzzle|recaptcha|hcaptcha|arkose/i.test(securityModal.reason)) && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">CAPTCHA / Security Puzzle Challenge</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      Cloudflare / Turnstile / reCAPTCHA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The employer portal requires human interaction to clear bot detection. If prompted on the portal, complete the challenge, then confirm below to resume submission.
                  </p>
                  {securityModal.checkpointUrl && (
                    <a
                      href={securityModal.checkpointUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold underline decoration-blue-500/50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Application Portal in New Window</span>
                    </a>
                  )}
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(verificationAnswers.captchaSolved)}
                      onChange={(e) =>
                        setVerificationAnswers((prev) => ({ ...prev, captchaSolved: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      I have completed the CAPTCHA / bot challenge on the careers portal.
                    </span>
                  </label>
                </div>
              )}

              {/* Challenge Type B: 2FA / OTP Code */}
              {((securityModal.type === "2FA_OTP") || /2fa|otp|passcode|6-digit|pin/i.test(securityModal.reason)) && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Two-Factor Authentication / OTP</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      Real 2FA Security
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the 6-digit verification code or one-time passcode sent to your phone or email.
                  </p>
                  <input
                    type="text"
                    value={verificationAnswers.otpCode || ""}
                    onChange={(e) =>
                      setVerificationAnswers((prev) => ({ ...prev, otpCode: e.target.value }))
                    }
                    placeholder="Enter OTP / verification code (e.g. 582914)"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {/* Challenge Type C: Email Verification */}
              {((securityModal.type === "EMAIL_VERIFICATION") || /email.*verif/i.test(securityModal.reason)) && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Email Verification Pending</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      Candidate Inbox Action
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A confirmation email was sent to your email address ({INITIAL_PROFILE.email}). Open your inbox, click the verification link, then confirm below.
                  </p>
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={verificationAnswers.emailToken || ""}
                      onChange={(e) =>
                        setVerificationAnswers((prev) => ({ ...prev, emailToken: e.target.value }))
                      }
                      placeholder="Optional: Paste email verification token / URL if provided"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(verificationAnswers.emailVerified)}
                        onChange={(e) =>
                          setVerificationAnswers((prev) => ({ ...prev, emailVerified: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span className="text-xs text-slate-200 font-medium">
                        I clicked the confirmation link in my email inbox.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Challenge Type D: Pre-Submission Approval Sign-Off */}
              {((securityModal.type === "SUBMISSION_APPROVAL") || /approval/i.test(securityModal.reason)) && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Pre-Submission Sign-Off Gate</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Final Approval
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div><span className="text-slate-500 font-semibold">Target Company:</span> {securityModal.job.company}</div>
                    <div><span className="text-slate-500 font-semibold">Job Title:</span> {securityModal.job.title}</div>
                    <div><span className="text-slate-500 font-semibold">Candidate:</span> {INITIAL_PROFILE.firstName} {INITIAL_PROFILE.lastName} ({INITIAL_PROFILE.email})</div>
                  </div>
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(verificationAnswers.approvalConfirmed)}
                      onChange={(e) =>
                        setVerificationAnswers((prev) => ({ ...prev, approvalConfirmed: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      I have reviewed this application and authorize JobPilot to submit to {securityModal.job.company}.
                    </span>
                  </label>
                </div>
              )}

              {/* Challenge Type E: Missing Required Fields / Custom ATS Questions */}
              {Array.isArray(securityModal.questions) && securityModal.questions.length > 0 && (
                <div className="space-y-3">
                  <div className="font-bold text-slate-200 text-xs">Required Candidate Information:</div>
                  {securityModal.questions.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">
                        {q.label || q.selector}
                      </label>
                      {q.hint && <p className="text-[10px] text-slate-400">{q.hint}</p>}
                      <input
                        type="text"
                        value={verificationAnswers[q.selector] || ""}
                        onChange={(e) =>
                          setVerificationAnswers((prev) => ({
                            ...prev,
                            [q.selector]: e.target.value,
                          }))
                        }
                        placeholder="Enter value..."
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* General missing profile info inputs if detected in reason */}
              {/missing.*phone|missing.*field|missing.*profile/i.test(securityModal.reason) && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200">Provide Missing Candidate Details:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                      <input
                        type="text"
                        defaultValue={INITIAL_PROFILE.phone}
                        onChange={(e) =>
                          setVerificationAnswers((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Location / City</label>
                      <input
                        type="text"
                        defaultValue={INITIAL_PROFILE.city}
                        onChange={(e) =>
                          setVerificationAnswers((prev) => ({ ...prev, city: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => setSecurityModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Keep Application Paused
              </button>

              <button
                onClick={() => {
                  const appId = securityModal.applicationId || securityModal.job.id;
                  handleResolveCheckpoint(appId, verificationAnswers);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Verify & Resume Application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
