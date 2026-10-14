export type CompanyTier = "S" | "A" | "B" | "C";

export interface Company {
  id: string;
  name: string;
  domain: string;
  logoText: string;
  location: string;
  stage: string;
  verifiedAts: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Custom";
  tier: CompanyTier;
  employeeCount?: string;
}

export interface JobSearchLoop {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ERROR";
  targetCountries: string[];
  targetLocations: string[];
  targetJobTitles: string[];
  excludedCompanies: string[];
  includedCompanies: string[];
  remotePreference: string;
  experienceLevel: string;
  employmentTypes: string[];
  minimumCompensation?: number;
  maximumCompensation?: number;
  targetTiers: string[];
  autoApplyEnabled: boolean;
  dailyApplicationLimit: number;
  dailyDiscoveryLimit: number;
  priorityStrategy: string;
  appliedCount: number;
  discoveredCount: number;
  interviewCount: number;
  lastRunAt?: string;
  nextRunAt?: string;
  resumeId?: string;
  createdAt: string;
  realtimeStats?: {
    appliedCount: number;
    inProgressCount: number;
    waitingUserCount: number;
    interviewCount: number;
  };
}

export interface QuestionAnswer {
  id: string;
  label: string;
  field: string;
  type: "text" | "textarea" | "select" | "boolean";
  aiProposedValue: string;
  userEditedValue?: string;
  confidence: number;
  isFlaggedForReview: boolean;
  reviewReason?: string;
}

export interface HumanAction {
  id: string;
  applicationId: string;
  type: "VERIFY_ANSWERS" | "CAPTCHA_RESOLUTION" | "COMPENSATION_CONFIRMATION" | "CUSTOM_ESSAY";
  title: string;
  description: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  deadline?: string;
  requiredFields: string[];
}

export interface GreenhouseScorecard {
  overallRecommendation: "Definitely Not" | "No" | "Yes" | "Strong Yes";
  score: 1 | 2 | 3 | 4 | 5;
  interviewer: string;
  interviewStage: string;
  submittedAt: string;
  technicalCompetence: number;
  systemDesign: number;
  communication: number;
  cultureAdd: number;
  keyStrengths: string[];
  areasOfConcern: string[];
  notes: string;
}

export interface Application {
  id: string;
  jobTitle: string;
  company: Company;
  jobUrl: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  salaryRange: string;
  status: "SAVED" | "TAILORING" | "WAITING_FOR_USER" | "QUEUED" | "RUNNING" | "SUBMITTED" | "INTERVIEW" | "OFFER" | "REJECTED";
  matchScore: number;
  atsProvider: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Custom";
  resumeVersionUsed: string;
  appliedAt?: string;
  lastUpdated: string;
  confirmationCode?: string;
  rejectionReason?: string;
  interviewRound?: string;
  scorecard?: GreenhouseScorecard;
  humanActions: HumanAction[];
  questions: QuestionAnswer[];
  tailoringNotes: {
    highlightedSkills: string[];
    customExecutiveSummary: string;
    gapAnalysis: string[];
  };
  telemetryLogs: {
    timestamp: string;
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
    step: string;
    detail: string;
  }[];
}

export interface ResumeExperienceEntry {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
  techStack: string[];
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string;
  year: string;
  gpa?: string;
  highlights?: string[];
}

export interface ResumeProjectEntry {
  title: string;
  link?: string;
  description: string;
  tech: string[];
}

export interface ResumeCertificationEntry {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  roleFocus: string;
  updatedAt: string;
  fileSize: string;
  isDefault: boolean;
  topSkills: string[];
  matchRateAverage?: number;
  atsScore?: number;
  summary?: string;
  experienceEntries?: ResumeExperienceEntry[];
  educationEntries?: ResumeEducationEntry[];
  projectEntries?: ResumeProjectEntry[];
  certificationEntries?: ResumeCertificationEntry[];
  languages?: string[];
  strengths?: string[];
  tailoringSuggestions?: string[];
}

export interface SelectionChanceBreakdown {
  overallPercentage: number;
  rating: "VERY_HIGH" | "HIGH" | "MODERATE" | "STRETCH";
  ratingLabel: string;
  shortlistProbability: string;
  matchedSkills: string[];
  missingOrBonusSkills: string[];
  experienceFitScore: number;
  skillFitScore: number;
  locationFitScore: number;
  rationale: string;
  actionableTip?: string;
}

export interface DiscoveredJob {
  id: string;
  jobTitle: string;
  companyName: string;
  companyDomain: string;
  logoText: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  salaryRange?: string;
  atsProvider: "Greenhouse" | "Lever" | "Ashby" | "Workday";
  jobUrl: string;
  matchScore?: number;
  selectionChance?: SelectionChanceBreakdown;
  discoveredAt: string;
  tags: string[];
  descriptionSnippet: string;
  isSaved?: boolean;
  companyTier?: CompanyTier;
  employeeCount?: string;
}

export interface CandidateProfile {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  preferredName?: string;
  pronouns?: string;
  title: string;
  currentCompany?: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  secondaryPhone?: string;
  location: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  website?: string;
  twitter?: string;
  leetcode?: string;
  codeforces?: string;
  kaggle?: string;
  stackoverflow?: string;
  dribbble?: string;
  behance?: string;
  yearsOfExperience: number;
  currentSalary?: number;
  desiredSalaryMin: number;
  desiredSalaryTarget: number;
  salaryCurrency?: string;
  noticePeriod?: number;
  availableStartDate?: string;
  workMode?: "Remote" | "Hybrid" | "On-site";
  willingToRelocate?: boolean;
  willingToTravel?: boolean;
  workAuthorization: "India Citizen / Eligible" | "US Citizen" | "Permanent Resident (Green Card)" | "Requires H-1B / Visa Transfer" | "Requires UK/EU Sponsorship" | "Other";
  sponsorshipRequired?: boolean;
  visaStatus?: string;
  is18OrOlder?: boolean;
  previousEmployee?: boolean;
  nonCompeteAgreement?: boolean;
  clearanceLevel: "None" | "Secret" | "Top Secret";
  highestDegree?: string;
  fieldOfStudy?: string;
  institution?: string;
  graduationYear?: string;
  gpa?: string;
  skills?: string[];
  languages?: string[];
  certifications?: string[];
  summary?: string;
  eeoPreferences: {
    gender: string;
    race: string;
    veteranStatus: string;
    disabilityStatus: string;
    autoFillEeo: boolean;
  };
  rateGovernorSettings: {
    maxDailyApplications: number;
    delayBetweenSubmissionsMinutes: number;
    stealthDelayJitterSeconds: string;
    autoSolveTurnstile: boolean;
    useProxyPool: boolean;
    stealthMode: boolean;
    pauseOnCustomEssays: boolean;
    activeConcurrencyLimit: number;
  };
  notificationChannels: {
    telegramEnabled: boolean;
    telegramChatId: string;
    discordWebhookEnabled: boolean;
    discordWebhookUrl: string;
    emailAlertsEnabled: boolean;
  };
}

export const TIER_PRIORITY: Record<CompanyTier, number> = { S: 0, A: 1, B: 2, C: 3 };

export function sortByTier<T extends { company?: Company; companyTier?: CompanyTier }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tierA = a.company?.tier ?? a.companyTier ?? "C";
    const tierB = b.company?.tier ?? b.companyTier ?? "C";
    return TIER_PRIORITY[tierA] - TIER_PRIORITY[tierB];
  });
}

export function getTierLabel(tier: CompanyTier): string {
  switch (tier) {
    case "S": return "S-Tier · MNC (Big Tech)";
    case "A": return "A-Tier · MNC (Major Tech)";
    case "B": return "B-Tier · Semi-MNC (Scaleup)";
    case "C": return "C-Tier · Startup (Remote)";
  }
}

export function getTierColor(tier: CompanyTier): { bg: string; text: string; border: string; dot: string; glow: string } {
  switch (tier) {
    case "S": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400", glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]" };
    case "A": return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400", glow: "shadow-[0_0_12px_rgba(59,130,246,0.2)]" };
    case "B": return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400", glow: "shadow-[0_0_12px_rgba(168,85,247,0.2)]" };
    case "C": return { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/25", dot: "bg-zinc-400", glow: "shadow-none" };
  }
}

/**
 * Deterministic Candidate Selection Probability & Match Engine
 * Computes exact selection chance, shortlist odds, and skill alignment
 */
// Greenhouse-style pipeline stages
export const PIPELINE_STAGES = [
  { key: "SAVED", label: "Application Review", count: 0, color: "stone", desc: "Ingested roles & ATS schema parsed" },
  { key: "TAILORING", label: "AI Tailoring", count: 0, color: "indigo", desc: "Keyword matching & vector CV alignment" },
  { key: "WAITING_FOR_USER", label: "Review Required", count: 0, color: "amber", isGate: true, desc: "Human sign-off on custom responses" },
  { key: "QUEUED", label: "Submission Queue", count: 0, color: "blue", desc: "Headless ATS execution queued" },
  { key: "SUBMITTED", label: "Applied (Receipt)", count: 0, color: "emerald", desc: "Verified confirmation token stored" },
  { key: "INTERVIEW", label: "Interview Loop", count: 0, color: "purple", desc: "Scorecards & technical rounds" },
  { key: "OFFER", label: "Offer", count: 0, color: "cyan", desc: "Compensation negotiation & sign" },
  { key: "REJECTED", label: "Archived / Rejected", count: 0, color: "rose", desc: "Rejection reasons cataloged" },
] as const;

export function getStatusLabel(status: Application["status"]): string {
  switch (status) {
    case "SAVED": return "Application Review";
    case "TAILORING": return "AI Tailoring";
    case "WAITING_FOR_USER": return "Review Required";
    case "QUEUED": return "In Queue";
    case "RUNNING": return "Submitting...";
    case "SUBMITTED": return "Applied";
    case "INTERVIEW": return "Interview";
    case "OFFER": return "Offer";
    case "REJECTED": return "Archived";
  }
}

export function getStatusColor(status: Application["status"]): { bg: string; text: string; border: string } {
  switch (status) {
    case "SAVED": return { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/25" };
    case "TAILORING": return { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/25" };
    case "WAITING_FOR_USER": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" };
    case "QUEUED": return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/25" };
    case "RUNNING": return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/25" };
    case "SUBMITTED": return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25" };
    case "INTERVIEW": return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/25" };
    case "OFFER": return { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/25" };
    case "REJECTED": return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/25" };
  }
}

export const GREENHOUSE_REJECTION_REASONS = [
  "Position Filled / Headcount Paused",
  "Skills / Tech Stack Mismatch",
  "Compensation Expectations Diverged",
  "Location / Visa Work Authorization Constraint",
  "Years of Experience Requirement",
  "Candidate Withdrew / Accepted Another Offer",
] as const;

