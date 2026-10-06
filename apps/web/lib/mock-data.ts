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
  recruiterOutreachEnabled: boolean;
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
  matchRateAverage: number;
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

// --- Tier Definitions & Lookup ---
export const S_TIER_COMPANIES = new Set([
  "google", "meta", "apple", "microsoft", "amazon", "netflix", "stripe", "nvidia", 
  "uber", "airbnb", "openai", "anthropic", "databricks", "snowflake", "salesforce", 
  "oracle", "cisco", "adobe", "intel", "ibm", "linkedin", "alphabet"
]);

export const A_TIER_COMPANIES = new Set([
  "spotify", "coinbase", "twilio", "atlassian", "shopify", "palantir", "cloudflare", 
  "figma", "canva", "pinterest", "snap", "doordash", "instacart", "square", "block", 
  "servicenow", "workday", "vmware", "paypal", "intuit", "ebay", "dell", "hp", "sap", 
  "siemens", "goldman sachs", "morgan stanley", "jp morgan", "jpmorgan", "visa", "mastercard"
]);

export const B_TIER_COMPANIES = new Set([
  "razorpay", "swiggy", "zomato", "cred", "postman", "browserstack", "freshworks", 
  "inmobi", "phonepe", "meesho", "zepto", "flipkart", "ola", "hasura", "vercel", 
  "supabase", "linear", "notion", "retool", "webflow", "loom", "brex", "ramp", 
  "rippling", "gusto", "deel", "groww", "zerodha", "clevertap", "chargebee"
]);

export function inferCompanyTier(name: string, domain?: string): CompanyTier {
  const cleanName = (name || "").toLowerCase().trim();
  const cleanDomain = (domain || "").toLowerCase().replace(/^www\./, "").split(".")[0];
  
  if (S_TIER_COMPANIES.has(cleanName) || (cleanDomain && S_TIER_COMPANIES.has(cleanDomain))) return "S";
  if (A_TIER_COMPANIES.has(cleanName) || (cleanDomain && A_TIER_COMPANIES.has(cleanDomain))) return "A";
  if (B_TIER_COMPANIES.has(cleanName) || (cleanDomain && B_TIER_COMPANIES.has(cleanDomain))) return "B";
  
  for (const s of Array.from(S_TIER_COMPANIES)) {
    if (cleanName.includes(s)) return "S";
  }
  for (const a of Array.from(A_TIER_COMPANIES)) {
    if (cleanName.includes(a)) return "A";
  }
  for (const b of Array.from(B_TIER_COMPANIES)) {
    if (cleanName.includes(b)) return "B";
  }

  return "C";
}

// Tier Priority (S -> A -> B -> C)
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
export function calculateSelectionChance(
  job: {
    jobTitle: string;
    descriptionSnippet?: string;
    description?: string;
    tags?: string[];
    location?: string;
    workMode?: string;
    companyTier?: CompanyTier;
  },
  profile?: CandidateProfile
): SelectionChanceBreakdown {
  const candidateSkills = profile?.skills || [
    "Distributed Systems",
    "Go",
    "TypeScript",
    "Kubernetes",
    "Kafka",
    "PostgreSQL",
    "AWS Core",
    "System Design",
    "React",
    "Next.js",
    "GraphQL",
    "Docker",
    "Rust",
    "Microservices",
    "eBPF",
    "C++",
    "Python",
    "SQL",
  ];

  const candidateYoe = profile?.yearsOfExperience ?? 8;
  const jobTags = job.tags && job.tags.length > 0 ? job.tags : ["Distributed Systems", "TypeScript", "Backend"];
  const textCorpus = `${job.jobTitle} ${job.descriptionSnippet || job.description || ""} ${jobTags.join(" ")}`.toLowerCase();

  // 1. Skill Overlap Calculation (45% weight)
  const matchedSkills: string[] = [];
  const missingOrBonusSkills: string[] = [];

  jobTags.forEach((tag) => {
    const isMatched = candidateSkills.some(
      (cs) => cs.toLowerCase() === tag.toLowerCase() || textCorpus.includes(cs.toLowerCase())
    );
    if (isMatched) {
      matchedSkills.push(tag);
    } else {
      missingOrBonusSkills.push(tag);
    }
  });

  const skillFitScore = Math.min(
    100,
    Math.max(50, Math.round((matchedSkills.length / Math.max(1, jobTags.length)) * 50 + (matchedSkills.length > 2 ? 45 : 30)))
  );

  // 2. Experience & Seniority Fit (25% weight)
  let experienceFitScore = 85;
  const isStaffOrPrincipal = /staff|principal|lead|architect|director/i.test(job.jobTitle);
  const isSenior = /senior|sr\./i.test(job.jobTitle);

  if (isStaffOrPrincipal) {
    experienceFitScore = candidateYoe >= 7 ? 96 : 78;
  } else if (isSenior) {
    experienceFitScore = candidateYoe >= 4 ? 94 : 80;
  } else {
    experienceFitScore = 90;
  }

  // 3. Location & Work Mode Fit (15% weight)
  let locationFitScore = 88;
  const isRemote = /remote|global|anywhere/i.test(job.workMode || "") || /remote/i.test(job.location || "");
  const isMatchingCity = /bengaluru|bangalore|san francisco|sf|california|ny|new york/i.test(job.location || "");

  if (isRemote) {
    locationFitScore = 98;
  } else if (isMatchingCity) {
    locationFitScore = 92;
  } else {
    locationFitScore = 75;
  }

  // 4. Tier Fit (15% weight)
  let tierFitScore = 90;
  if (job.companyTier === "S") tierFitScore = 95;
  else if (job.companyTier === "A") tierFitScore = 92;
  else if (job.companyTier === "B") tierFitScore = 88;
  else tierFitScore = 84;

  // Composite Deterministic Score
  const rawScore = skillFitScore * 0.45 + experienceFitScore * 0.25 + locationFitScore * 0.15 + tierFitScore * 0.15;
  const overallPercentage = Math.min(99, Math.max(55, Math.round(rawScore)));

  let rating: "VERY_HIGH" | "HIGH" | "MODERATE" | "STRETCH" = "MODERATE";
  let ratingLabel = "Moderate Chance · Competitive Applicant";
  let shortlistProbability = "Top 25% Match (60% Shortlist Odds)";
  let rationale = `Strong foundation in ${matchedSkills.slice(0, 2).join(" & ") || "required skills"}, matching candidate seniority profile.`;
  let actionableTip = "Highlight specific production metrics and architectural throughput on resume page 1.";

  if (overallPercentage >= 92) {
    rating = "VERY_HIGH";
    ratingLabel = "Very High Selection Chance · Tier-1 Hire Fit";
    shortlistProbability = "Top 3% Applicant Match (88% Shortlist Odds)";
    rationale = `Exceptional skill synergy in ${matchedSkills.slice(0, 3).join(", ") || "core systems"}. Your ${candidateYoe}+ years directly satisfies staff-level ATS filters.`;
    actionableTip = "Emphasize multi-region consensus and zero-downtime ledger throughput for instant ATS shortlisting.";
  } else if (overallPercentage >= 82) {
    rating = "HIGH";
    ratingLabel = "High Selection Chance · Strongly Recommended";
    shortlistProbability = "Top 10% Applicant Match (76% Shortlist Odds)";
    rationale = `High overlap with target requirements (${matchedSkills.join(", ")}). Strong alignment with team tech stack.`;
    actionableTip = "Add relevant domain keywords to your executive summary before submitting.";
  } else if (overallPercentage >= 70) {
    rating = "MODERATE";
    ratingLabel = "Moderate Chance · Solid Contender";
    shortlistProbability = "Top 20% Applicant Match (58% Shortlist Odds)";
    rationale = `Good baseline overlap. Gaps in secondary skills (${missingOrBonusSkills.slice(0, 2).join(", ") || "niche tooling"}) can be addressed in interview loop.`;
    actionableTip = "Tailor your project descriptions to demonstrate transferable concurrency and scale experience.";
  } else {
    rating = "STRETCH";
    ratingLabel = "Competitive Stretch · Requires Custom Tailoring";
    shortlistProbability = "Top 40% Applicant Match (42% Shortlist Odds)";
    rationale = `Domain shift required. Focus on foundational systems principles rather than specific tool mastery.`;
    actionableTip = "Utilize AI Tailoring to re-weight resume towards adjacent competencies.";
  }

  return {
    overallPercentage,
    rating,
    ratingLabel,
    shortlistProbability,
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : ["Systems Engineering", "Backend"],
    missingOrBonusSkills,
    experienceFitScore,
    skillFitScore,
    locationFitScore,
    rationale,
    actionableTip,
  };
}

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

// --- Initial Seeded Resumes ---
export const INITIAL_RESUMES: ResumeVersion[] = [
  {
    id: "res-01",
    name: "Staff_Distributed_Systems_2026.pdf",
    roleFocus: "Staff Software Engineer / Distributed Backend",
    updatedAt: "Today, 11:20 AM",
    fileSize: "148 KB",
    isDefault: true,
    topSkills: [
      "Distributed Systems",
      "Go",
      "Rust",
      "TypeScript",
      "Kubernetes",
      "Kafka",
      "PostgreSQL",
      "AWS Core",
      "gRPC",
      "System Architecture",
    ],
    matchRateAverage: 96,
    atsScore: 98,
    summary:
      "Staff Distributed Systems & Infrastructure Architect with 8+ years experience designing ultra-low latency transaction backends, Raft-based consensus engines, and event-driven data streaming pipelines processing 50k+ QPS with five-nines uptime.",
    experienceEntries: [
      {
        company: "Nexus Cloud Architecture",
        role: "Staff Infrastructure Engineer & Tech Lead",
        period: "2022 – Present",
        location: "San Francisco, CA / Hybrid",
        bullets: [
          "Architected real-time event routing fabric in Go and Kafka handling 4.2B events daily with p99 latency < 12ms.",
          "Designed multi-region Postgres active-active replication layer using logical decoding and CRDT sync conflict resolution.",
          "Led 14-engineer infrastructure guild across Kubernetes multi-cluster mesh, slashing cloud egress costs by 34% ($1.2M annual savings).",
          "Engineered distributed rate limiting and anti-DDoS filter in Rust and eBPF deployed across 18 edge PoPs.",
        ],
        techStack: ["Go", "Rust", "Kafka", "PostgreSQL", "Kubernetes", "eBPF", "AWS", "gRPC"],
      },
      {
        company: "Stripe Scale Engineering (Contract / Prior)",
        role: "Senior Backend Platform Engineer",
        period: "2019 – 2022",
        location: "San Francisco, CA / Remote",
        bullets: [
          "Refactored ledger reconciliation service to support idempotent transaction dispatch under high network jitter.",
          "Built zero-downtime database migration tooling adopted by 40+ product teams to safely migrate 500M+ rows.",
          "Maintained 99.999% SLA for core settlement pipeline during peak Black Friday / Cyber Monday traffic surges.",
        ],
        techStack: ["Go", "TypeScript", "PostgreSQL", "Redis", "Docker", "Datadog", "Terraform"],
      },
      {
        company: "Vanguard Tech Labs",
        role: "Distributed Systems Software Engineer",
        period: "2018 – 2019",
        location: "San Francisco, CA",
        bullets: [
          "Implemented gRPC microservices and protobuf contracts for high-frequency order book gateway.",
          "Automated CI/CD release canary pipelines on Kubernetes reducing deployment cycle time from 2 hours to 8 minutes.",
        ],
        techStack: ["Go", "Python", "Docker", "gRPC", "Prometheus", "Kubernetes"],
      },
    ],
    educationEntries: [
      {
        institution: "Stanford University",
        degree: "Master of Science in Computer Science (Distributed Systems)",
        year: "2018",
        gpa: "3.92 / 4.0",
        highlights: ["Research in Fault-Tolerant Distributed Consensus", "Teaching Assistant for CS244B (Distributed Systems)"],
      },
      {
        institution: "University of California, Berkeley",
        degree: "Bachelor of Science in Electrical Engineering & Computer Science (EECS)",
        year: "2016",
        gpa: "3.88 / 4.0",
        highlights: ["Dean's Honors List", "Upsilon Pi Epsilon Honor Society"],
      },
    ],
    projectEntries: [
      {
        title: "Raft-KV Distributed Key-Value Store",
        link: "https://github.com/alexrivera-eng/raft-kv",
        description: "Pure Go implementation of the Raft consensus protocol with snapshotting, dynamic cluster membership, and linearizable reads.",
        tech: ["Go", "Raft", "gRPC", "BoltDB"],
      },
      {
        title: "Async-Queue Rust Edge Worker",
        link: "https://github.com/alexrivera-eng/async-queue-rs",
        description: "Lightweight Tokio-based transactional message broker with dead-letter queue routing and lock-free memory buffers.",
        tech: ["Rust", "Tokio", "WebAssembly", "Docker"],
      },
    ],
    certificationEntries: [
      {
        name: "AWS Certified Solutions Architect – Professional",
        issuer: "Amazon Web Services",
        date: "2024",
        credentialId: "AWS-PSA-9912048",
      },
      {
        name: "Certified Kubernetes Administrator (CKA)",
        issuer: "Cloud Native Computing Foundation (CNCF)",
        date: "2023",
        credentialId: "CKA-281940",
      },
    ],
    languages: ["English (Native)", "Spanish (Professional Working)"],
    strengths: [
      "Deep distributed systems intuition (CAP theorem, consensus, ledger idempotency)",
      "High-scale concurrency mastery in Go, Rust, and TypeScript",
      "Production cloud infrastructure optimization and cost engineering",
    ],
    tailoringSuggestions: [
      "Highlight multi-region database failover metrics when applying to Big Tech (Stripe, Google, AWS).",
      "Emphasize developer ergonomics and team mentoring experience for Staff/Principal roles.",
    ],
  },
  {
    id: "res-02",
    name: "Senior_Fullstack_Platform_2026.pdf",
    roleFocus: "Senior Full Stack Platform & Product Infrastructure",
    updatedAt: "Yesterday",
    fileSize: "136 KB",
    isDefault: false,
    topSkills: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "GraphQL",
      "TailwindCSS",
      "PostgreSQL",
      "Prisma",
      "Docker",
      "WebSockets",
    ],
    matchRateAverage: 91,
    atsScore: 94,
    summary:
      "Senior Full Stack & Platform Engineer with 7+ years expertise architecting high-performance React/Next.js web applications, GraphQL microservices, and collaborative real-time web engines.",
    experienceEntries: [
      {
        company: "HyperCanvas Interactive",
        role: "Senior Full Stack Platform Lead",
        period: "2021 – Present",
        location: "San Francisco, CA / Remote",
        bullets: [
          "Built collaborative canvas editor in Next.js, WebGL, and WebSockets serving 1.8M monthly active designers.",
          "Reduced First Contentful Paint (FCP) by 58% and initial JS bundle by 140KB via dynamic code splitting and Turbopack.",
          "Created design system library of 65+ accessible WCAG AA compliant headless components adopted across 6 company web apps.",
        ],
        techStack: ["Next.js", "React", "TypeScript", "TailwindCSS", "PostgreSQL", "Prisma", "WebSockets"],
      },
      {
        company: "PixelForge Digital",
        role: "Full Stack Engineer",
        period: "2018 – 2021",
        location: "Austin, TX",
        bullets: [
          "Developed high-traffic customer onboarding portal increasing conversion rate by 22% with optimistic UI updates.",
          "Architected GraphQL federation gateway integrating 12 microservices with automated caching and schema stitching.",
        ],
        techStack: ["React", "Node.js", "GraphQL", "PostgreSQL", "Redis", "Docker"],
      },
    ],
    educationEntries: [
      {
        institution: "University of California, Berkeley",
        degree: "Bachelor of Science in EECS",
        year: "2016",
        gpa: "3.88 / 4.0",
        highlights: ["Human-Computer Interaction (HCI) Specialization"],
      },
    ],
    projectEntries: [
      {
        title: "FastTable Data Grid Engine",
        link: "https://github.com/alexrivera-eng/fast-table",
        description: "Zero-dependency virtualized data grid rendering 100,000+ rows at 60 FPS with full Excel-style inline editing.",
        tech: ["TypeScript", "React", "Canvas API"],
      },
    ],
    certificationEntries: [
      {
        name: "Meta Certified Front-End Developer",
        issuer: "Meta",
        date: "2023",
        credentialId: "META-FE-48201",
      },
    ],
    languages: ["English (Native)", "Spanish (Conversational)"],
    strengths: [
      "Ultra-responsive frontend UI architecture (Next.js App Router, React Server Components)",
      "Real-time WebSocket & CRDT collaboration experience",
      "Full stack TypeScript end-to-end type safety",
    ],
    tailoringSuggestions: [
      "Include canvas rendering performance benchmarks when targeting Figma, Canva, or Miro.",
      "Showcase GraphQL federation and state management depth for scaleups.",
    ],
  },
];

// --- Initial Seeded Candidate Profile ---
export const INITIAL_CANDIDATE_PROFILE: CandidateProfile = {
  firstName: "Alex",
  middleName: "James",
  lastName: "Rivera",
  fullName: "Alex Rivera",
  preferredName: "Alex",
  pronouns: "He / Him",
  title: "Staff Distributed Systems & Infrastructure Engineer",
  currentCompany: "Nexus Cloud Architecture",
  email: "alex.rivera@eng-lead.io",
  phone: "+1 (415) 890-2134",
  phoneCountryCode: "+1",
  secondaryPhone: "+1 (415) 890-2135",
  location: "San Francisco, CA / Bengaluru (Open to Remote & Hybrid)",
  address: "742 Market Street, Suite 500",
  addressLine2: "Apt 4B",
  city: "San Francisco",
  state: "California",
  country: "United States",
  zipCode: "94103",
  linkedIn: "https://linkedin.com/in/alex-rivera-systems",
  github: "https://github.com/alexrivera-eng",
  portfolio: "https://alexrivera.dev",
  website: "https://alexrivera.dev",
  twitter: "https://x.com/alexrivera_eng",
  leetcode: "https://leetcode.com/alexrivera",
  codeforces: "https://codeforces.com/profile/alexrivera",
  kaggle: "https://kaggle.com/alexrivera",
  stackoverflow: "https://stackoverflow.com/users/alexrivera",
  yearsOfExperience: 8,
  currentSalary: 210000,
  desiredSalaryMin: 220000,
  desiredSalaryTarget: 275000,
  salaryCurrency: "USD",
  noticePeriod: 15,
  availableStartDate: "2026-11-01",
  workMode: "Remote",
  willingToRelocate: true,
  willingToTravel: true,
  workAuthorization: "US Citizen",
  sponsorshipRequired: false,
  visaStatus: "Citizen",
  is18OrOlder: true,
  previousEmployee: false,
  nonCompeteAgreement: false,
  clearanceLevel: "None",
  highestDegree: "Master of Science in Computer Science",
  fieldOfStudy: "Computer Science & Distributed Systems",
  institution: "Stanford University",
  graduationYear: "2018",
  gpa: "3.92 / 4.0",
  skills: [
    "Distributed Systems",
    "Go",
    "Rust",
    "TypeScript",
    "PostgreSQL",
    "Kafka",
    "Kubernetes",
    "Docker",
    "Redis",
    "gRPC",
    "Next.js",
    "System Architecture",
  ],
  languages: ["English (Native / Bilingual)", "Spanish (Professional Working)"],
  certifications: [
    "AWS Certified Solutions Architect - Professional",
    "Certified Kubernetes Administrator (CKA)",
  ],
  summary: "Staff Engineer with 8+ years experience architecting high-throughput distributed transaction engines, real-time message streaming pipelines, and cloud-native infrastructure handling 50k+ QPS with five-nines reliability.",
  eeoPreferences: {
    gender: "Male",
    race: "Decline to self-identify",
    veteranStatus: "I am not a protected veteran",
    disabilityStatus: "No, I do not have a disability",
    autoFillEeo: true,
  },
  rateGovernorSettings: {
    maxDailyApplications: 8,
    delayBetweenSubmissionsMinutes: 20,
    stealthDelayJitterSeconds: "15-45s",
    autoSolveTurnstile: true,
    useProxyPool: true,
    stealthMode: true,
    pauseOnCustomEssays: true,
    activeConcurrencyLimit: 2,
  },
  notificationChannels: {
    telegramEnabled: true,
    telegramChatId: "@alexrivera_alerts",
    discordWebhookEnabled: false,
    discordWebhookUrl: "",
    emailAlertsEnabled: true,
  },
};

// --- Seeded Greenhouse Applications (S-Tier MNCs, A-Tier MNCs, B-Tier Semi-MNCs, C-Tier Startups) ---
export const INITIAL_APPLICATIONS: Application[] = [
  // 1. S-Tier MNC - Stripe (INTERVIEW stage with Greenhouse Scorecard)
  {
    id: "app-strp-01",
    jobTitle: "Staff Infrastructure Engineer - Global Payments Core",
    company: {
      id: "c-strp",
      name: "Stripe",
      domain: "stripe.com",
      logoText: "ST",
      location: "San Francisco, CA / Remote",
      stage: "Tier 1 MNC · Big Tech",
      verifiedAts: "Greenhouse",
      tier: "S",
      employeeCount: "8,000+",
    },
    jobUrl: "https://boards.greenhouse.io/stripe/jobs/4910283",
    location: "Remote (Global) / San Francisco, CA",
    workMode: "Remote",
    salaryRange: "$240,000 – $310,000",
    status: "INTERVIEW",
    matchScore: 98,
    atsProvider: "Greenhouse",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    appliedAt: "2 days ago",
    lastUpdated: "1 hour ago",
    interviewRound: "Onsite Loop: System Architecture & Concurrency",
    scorecard: {
      overallRecommendation: "Strong Yes",
      score: 5,
      interviewer: "Elena Vance (Principal Infrastructure Architect)",
      interviewStage: "Distributed Consensus & Raft Deep Dive",
      submittedAt: "Yesterday at 4:30 PM",
      technicalCompetence: 5,
      systemDesign: 5,
      communication: 4,
      cultureAdd: 5,
      keyStrengths: ["Deep mastery of distributed ledger idempotency", "Exceptional live whiteboarding of multi-region replication", "Zero hesitation on race condition edge cases"],
      areasOfConcern: ["Prefers Go/Rust over Ruby for core services (Stripe is migrating)"],
      notes: "Alex passed the distributed systems loop with top percentile scores. Highly recommended for Level 6 Staff band.",
    },
    humanActions: [],
    questions: [
      {
        id: "q-strp-1",
        label: "Describe a distributed consistency challenge you resolved at scale.",
        field: "essay_consistency",
        type: "textarea",
        aiProposedValue: "Engineered a dual-phase commit reconciliation engine with distributed dead-letter queues handling 50k RPS with zero ledger divergence.",
        confidence: 0.98,
        isFlaggedForReview: false,
      },
      {
        id: "q-strp-2",
        label: "Desired Total Target Cash Compensation",
        field: "comp_target",
        type: "text",
        aiProposedValue: "$295,000 Base + Equity",
        confidence: 0.95,
        isFlaggedForReview: false,
      },
    ],
    tailoringNotes: {
      highlightedSkills: ["Distributed Ledger", "High Concurrency", "Idempotency", "Kafka", "Go", "PostgreSQL"],
      customExecutiveSummary: "8+ years scaling financial-grade distributed transaction backends with five-nines availability and sub-20ms p99 latency.",
      gapAnalysis: ["Fully matched all Stripe Staff Infrastructure competencies."],
    },
    telemetryLogs: [
      { timestamp: "09:12", level: "INFO", step: "GREENHOUSE_PARSE", detail: "Detected Greenhouse ATS form schema with custom essay prompts." },
      { timestamp: "09:14", level: "SUCCESS", step: "HUMAN_SIGN_OFF", detail: "Candidate verified answers and approved submission." },
      { timestamp: "09:15", level: "SUCCESS", step: "SUBMISSION_VERIFIED", detail: "Form submitted. Greenhouse candidate token #GH-STR-9912 generated." },
      { timestamp: "11:30", level: "SUCCESS", step: "RECRUITER_INVITE", detail: "Recruiter screening passed. Advanced to Onsite Technical Loop." },
    ],
  },

  // 2. S-Tier MNC - Google (WAITING_FOR_USER - Review Required Gate)
  {
    id: "app-goog-01",
    jobTitle: "Senior Staff Software Engineer - Cloud AI & Kubernetes",
    company: {
      id: "c-goog",
      name: "Google",
      domain: "google.com",
      logoText: "GO",
      location: "Bengaluru, India / Mountain View, CA",
      stage: "Tier 1 MNC · Global Tech",
      verifiedAts: "Greenhouse",
      tier: "S",
      employeeCount: "180,000+",
    },
    jobUrl: "https://boards.greenhouse.io/google/jobs/5829104",
    location: "Bengaluru / Mountain View / Hybrid",
    workMode: "Hybrid",
    salaryRange: "$260,000 – $340,000",
    status: "WAITING_FOR_USER",
    matchScore: 96,
    atsProvider: "Greenhouse",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    lastUpdated: "10 mins ago",
    humanActions: [
      {
        id: "ha-goog-1",
        applicationId: "app-goog-01",
        type: "VERIFY_ANSWERS",
        title: "Review Google Cloud AI Architecture Essay & Target Band",
        description: "Google's Greenhouse form asks for your biggest technical achievement and compensation preference before submission.",
        status: "PENDING",
        deadline: "Today by 6:00 PM",
        requiredFields: ["essay_achievement", "comp_target", "relocation"],
      },
    ],
    questions: [
      {
        id: "q-goog-1",
        label: "Describe your experience scaling Kubernetes clusters and custom controllers across multi-cloud.",
        field: "essay_achievement",
        type: "textarea",
        aiProposedValue: "Architected Kubernetes operator in Go that managed 1,200 multi-tenant worker nodes with automated auto-scaling, dynamic bin-packing, and zero-downtime control plane upgrades.",
        confidence: 0.94,
        isFlaggedForReview: true,
        reviewReason: "Custom technical essay requires candidate confirmation.",
      },
      {
        id: "q-goog-2",
        label: "What is your target total annual compensation (INR or USD)?",
        field: "comp_target",
        type: "text",
        aiProposedValue: "$310,000 TC (Base + Stock Units)",
        confidence: 0.92,
        isFlaggedForReview: true,
        reviewReason: "Verify compensation alignment before submission to Google ATS.",
      },
      {
        id: "q-goog-3",
        label: "Are you authorized to work in the selected country without sponsorship?",
        field: "work_auth",
        type: "select",
        aiProposedValue: "Yes - US Citizen / OCI",
        confidence: 0.99,
        isFlaggedForReview: false,
      },
    ],
    tailoringNotes: {
      highlightedSkills: ["Kubernetes Internals", "Golang", "Borg/Cluster Architecture", "Large Scale Inference", "eBPF"],
      customExecutiveSummary: "Specialist in high-throughput container orchestrators, GPU cluster scheduling, and distributed storage infrastructure.",
      gapAnalysis: ["Recommended highlighting experience with TPU/GPU accelerators."],
    },
    telemetryLogs: [
      { timestamp: "14:20", level: "INFO", step: "GREENHOUSE_INGEST", detail: "Parsed Google Cloud AI opening from Greenhouse board." },
      { timestamp: "14:21", level: "INFO", step: "VECTOR_MATCHING", detail: "Generated 96% match score with Staff Distributed Systems CV." },
      { timestamp: "14:22", level: "WARN", step: "HUMAN_GATE_TRIGGERED", detail: "Form contains mandatory custom essay questions. Paused in Review Required." },
    ],
  },

  // 3. S-Tier MNC - OpenAI (SUBMITTED)
  {
    id: "app-open-01",
    jobTitle: "Research Systems Engineer - Inference & Training Infrastructure",
    company: {
      id: "c-open",
      name: "OpenAI",
      domain: "openai.com",
      logoText: "OA",
      location: "San Francisco, CA / Hybrid",
      stage: "Tier 1 MNC · Frontier AI",
      verifiedAts: "Ashby",
      tier: "S",
      employeeCount: "1,500+",
    },
    jobUrl: "https://jobs.ashbyhq.com/openai/9182-4112",
    location: "San Francisco, CA",
    workMode: "Hybrid",
    salaryRange: "$270,000 – $360,000",
    status: "SUBMITTED",
    matchScore: 97,
    atsProvider: "Ashby",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    appliedAt: "3 days ago",
    lastUpdated: "Yesterday",
    confirmationCode: "CONF-OA-881920",
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["PyTorch Core", "CUDA Kernels", "NCCL Interconnects", "Distributed Checkpointing", "C++20"],
      customExecutiveSummary: "Frontier systems engineer specializing in low-overhead collective communications and petabyte-scale training checkpointing.",
      gapAnalysis: ["100% matched."],
    },
    telemetryLogs: [
      { timestamp: "10:00", level: "INFO", step: "ASHBY_CRAWL", detail: "Ingested OpenAI Research Systems opening." },
      { timestamp: "10:05", level: "SUCCESS", step: "HUMAN_SIGN_OFF", detail: "Candidate approved application package." },
      { timestamp: "10:07", level: "SUCCESS", step: "SUBMISSION_VERIFIED", detail: "Ashby webhook receipt confirmed: Token #CONF-OA-881920." },
    ],
  },

  // 4. A-Tier MNC - Spotify (OFFER stage)
  {
    id: "app-spot-01",
    jobTitle: "Staff Backend Engineer - Audio Streaming & Discovery Engine",
    company: {
      id: "c-spot",
      name: "Spotify",
      domain: "spotify.com",
      logoText: "SP",
      location: "Stockholm / New York / Remote",
      stage: "Tier 2 MNC · Major Tech",
      verifiedAts: "Greenhouse",
      tier: "A",
      employeeCount: "9,000+",
    },
    jobUrl: "https://boards.greenhouse.io/spotify/jobs/5201948",
    location: "New York / Remote",
    workMode: "Remote",
    salaryRange: "$210,000 – $270,000",
    status: "OFFER",
    matchScore: 95,
    atsProvider: "Greenhouse",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    appliedAt: "2 weeks ago",
    lastUpdated: "3 hours ago",
    confirmationCode: "OFFER-SPOT-2026-91",
    scorecard: {
      overallRecommendation: "Strong Yes",
      score: 5,
      interviewer: "Hiring Manager Panel & VP of Engineering",
      interviewStage: "Executive Round & Offer Call",
      submittedAt: "Yesterday at 2:00 PM",
      technicalCompetence: 5,
      systemDesign: 5,
      communication: 5,
      cultureAdd: 5,
      keyStrengths: ["Deep understanding of low-latency caching and audio codec streaming", "Collaborative demeanor aligned with Swedish engineering culture"],
      areasOfConcern: [],
      notes: "Formal offer package extended: $255k Base + $120k/yr RSUs + $30k Sign-on. Candidate considering.",
    },
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["Java", "gRPC", "Kafka", "Low Latency Audio", "Microservices"],
      customExecutiveSummary: "High-scale streaming engineer with proven track record handling 500M+ real-time concurrent audio connections.",
      gapAnalysis: [],
    },
    telemetryLogs: [
      { timestamp: "08:30", level: "SUCCESS", step: "OFFER_EXTENDED", detail: "Greenhouse Offer Letter #OFFER-SPOT-2026-91 received for candidate review." },
    ],
  },

  // 5. A-Tier MNC - Figma (TAILORING stage)
  {
    id: "app-figm-01",
    jobTitle: "Systems Engineer - WebGL & Multiplayer Canvas Engine",
    company: {
      id: "c-figm",
      name: "Figma",
      domain: "figma.com",
      logoText: "FG",
      location: "San Francisco, CA / New York / Hybrid",
      stage: "Tier 2 MNC · Major Tech",
      verifiedAts: "Ashby",
      tier: "A",
      employeeCount: "2,000+",
    },
    jobUrl: "https://jobs.ashbyhq.com/figma/6102-1823",
    location: "San Francisco, CA",
    workMode: "Hybrid",
    salaryRange: "$220,000 – $280,000",
    status: "TAILORING",
    matchScore: 93,
    atsProvider: "Ashby",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    lastUpdated: "25 mins ago",
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["WebAssembly", "C++", "Rust", "CRDT Sync", "WebGL Shaders"],
      customExecutiveSummary: "Optimizing canvas rendering loops and multi-user operational transformation protocols.",
      gapAnalysis: ["Aligning WebAssembly build tooling with Ashby requirement tags."],
    },
    telemetryLogs: [
      { timestamp: "14:05", level: "INFO", step: "AI_VECTOR_TAILOR", detail: "Extracting semantic keywords from Figma Systems opening." },
    ],
  },

  // 6. B-Tier Semi-MNC - Razorpay (SAVED stage)
  {
    id: "app-rzrp-01",
    jobTitle: "Lead Platform Engineer - Banking Core & UPI Switch",
    company: {
      id: "c-rzrp",
      name: "Razorpay",
      domain: "razorpay.com",
      logoText: "RZ",
      location: "Bengaluru, Karnataka, India",
      stage: "Tier 3 Semi-MNC · Scaleup Unicorn",
      verifiedAts: "Greenhouse",
      tier: "B",
      employeeCount: "3,500+",
    },
    jobUrl: "https://boards.greenhouse.io/razorpay/jobs/8201923",
    location: "Bengaluru, Karnataka",
    workMode: "Hybrid",
    salaryRange: "₹45,00,000 – ₹70,00,000",
    status: "SAVED",
    matchScore: 91,
    atsProvider: "Greenhouse",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    lastUpdated: "1 hour ago",
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["UPI Architecture", "High TPS Go Services", "Distributed Transactions", "MySQL Sharding"],
      customExecutiveSummary: "Backend platform leader with deep expertise in payment switch orchestration and zero-downtime banking gateways.",
      gapAnalysis: [],
    },
    telemetryLogs: [
      { timestamp: "13:45", level: "INFO", step: "SAVED_TO_PIPELINE", detail: "Opening saved to board for candidate review." },
    ],
  },

  // 7. B-Tier Semi-MNC - Postman (QUEUED stage)
  {
    id: "app-post-01",
    jobTitle: "Staff Software Engineer - API Runtime & Mocking Engine",
    company: {
      id: "c-post",
      name: "Postman",
      domain: "postman.com",
      logoText: "PM",
      location: "Bengaluru, India / San Francisco / Remote",
      stage: "Tier 3 Semi-MNC · Global Developer Tool",
      verifiedAts: "Greenhouse",
      tier: "B",
      employeeCount: "1,200+",
    },
    jobUrl: "https://boards.greenhouse.io/postman/jobs/3820192",
    location: "Bengaluru / Remote",
    workMode: "Remote",
    salaryRange: "$180,000 – $230,000",
    status: "QUEUED",
    matchScore: 94,
    atsProvider: "Greenhouse",
    resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
    lastUpdated: "45 mins ago",
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["Node.js Internals", "V8 Engine", "TypeScript", "HTTP/3 & gRPC", "Electron Architecture"],
      customExecutiveSummary: "Developer tooling systems architect specialized in asynchronous event execution and API contract validation.",
      gapAnalysis: [],
    },
    telemetryLogs: [
      { timestamp: "14:10", level: "INFO", step: "RATE_GOVERNOR_QUEUED", detail: "Scheduled for automated submission. Slot #1 in queue." },
    ],
  },

  // 8. C-Tier Remote Startup - Resend (REJECTED stage with Greenhouse Rejection Reason)
  {
    id: "app-rsnd-01",
    jobTitle: "Full Stack Engineer - Email Infrastructure & React Email",
    company: {
      id: "c-rsnd",
      name: "Resend",
      domain: "resend.com",
      logoText: "RS",
      location: "Remote (Global)",
      stage: "Tier 4 Remote Startup",
      verifiedAts: "Ashby",
      tier: "C",
      employeeCount: "25",
    },
    jobUrl: "https://jobs.ashbyhq.com/resend/1029-4829",
    location: "Remote (Global)",
    workMode: "Remote",
    salaryRange: "$140,000 – $180,000",
    status: "REJECTED",
    matchScore: 86,
    atsProvider: "Ashby",
    resumeVersionUsed: "Senior_Fullstack_Platform_2026.pdf",
    appliedAt: "3 weeks ago",
    lastUpdated: "4 days ago",
    rejectionReason: "Position Filled / Headcount Paused",
    humanActions: [],
    questions: [],
    tailoringNotes: {
      highlightedSkills: ["React", "Next.js", "SMTP / DNS Protocol", "Serverless Edge"],
      customExecutiveSummary: "Product and full-stack engineer building developer-first email platforms.",
      gapAnalysis: ["Candidate overqualified for early-stage full-stack role."],
    },
    telemetryLogs: [
      { timestamp: "11:00", level: "WARN", step: "ATS_STATUS_ARCHIVED", detail: "Automated notice received: Role closed as position filled." },
    ],
  },
];

// --- Discovered Jobs Seed with Precomputed Selection Chances ---
const RAW_DISCOVERED_JOBS = [
  {
    id: "disc-goog-01",
    jobTitle: "Senior Staff Software Engineer - Cloud AI & Distributed Storage",
    companyName: "Google",
    companyDomain: "google.com",
    logoText: "GO",
    location: "Bengaluru, India / Mountain View, CA",
    workMode: "Hybrid" as const,
    salaryRange: "$260,000 – $340,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/google/jobs/5829104",
    discoveredAt: "Just now",
    tags: ["Distributed Systems", "Kubernetes", "Go", "Borg", "Large Scale Inference", "PostgreSQL"],
    descriptionSnippet: "Build next-generation distributed storage and cluster management systems powering Gemini and Vertex AI large scale inference pipelines.",
    companyTier: "S" as const,
    employeeCount: "180,000+",
  },
  {
    id: "disc-strp-01",
    jobTitle: "Staff Infrastructure Engineer - Global Payments Core",
    companyName: "Stripe",
    companyDomain: "stripe.com",
    logoText: "ST",
    location: "Remote (Global) / San Francisco, CA",
    workMode: "Remote" as const,
    salaryRange: "$240,000 – $310,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/stripe/jobs/4910283",
    discoveredAt: "2 mins ago",
    tags: ["Distributed Systems", "Go", "Kafka", "PostgreSQL", "Idempotency", "System Design"],
    descriptionSnippet: "Design high-reliability distributed ledger architectures processing hundreds of billions in financial volume with five-nines uptime.",
    companyTier: "S" as const,
    employeeCount: "8,000+",
  },
  {
    id: "disc-nvda-01",
    jobTitle: "Senior CUDA Systems Engineer - TensorRT & Accelerated Computing",
    companyName: "NVIDIA",
    companyDomain: "nvidia.com",
    logoText: "NV",
    location: "Bengaluru, India / Santa Clara, CA",
    workMode: "Hybrid" as const,
    salaryRange: "$220,000 – $290,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/nvidia/jobs/7102941",
    discoveredAt: "5 mins ago",
    tags: ["CUDA", "C++", "TensorRT", "GPU Architecture", "Deep Learning Compilers", "Distributed Systems"],
    descriptionSnippet: "Develop ultra-low latency inference engines and deep memory hierarchy optimizations for Blackwell architectures.",
    companyTier: "S" as const,
    employeeCount: "29,000+",
  },
  {
    id: "disc-msft-01",
    jobTitle: "Principal Distributed Systems Architect - Azure Core",
    companyName: "Microsoft",
    companyDomain: "microsoft.com",
    logoText: "MS",
    location: "Bengaluru, India / Redmond, WA",
    workMode: "Hybrid" as const,
    salaryRange: "$230,000 – $295,000",
    atsProvider: "Ashby" as const,
    jobUrl: "https://jobs.ashbyhq.com/microsoft/d91a-4712",
    discoveredAt: "8 mins ago",
    tags: ["Distributed Systems", "Azure", "Go", "Kubernetes", "High Availability", "Kafka"],
    descriptionSnippet: "Architect high-throughput, low-latency microservices and edge compute fabrics running hyper-scale enterprise infrastructure.",
    companyTier: "S" as const,
    employeeCount: "220,000+",
  },
  {
    id: "disc-open-01",
    jobTitle: "Research Systems Engineer - Inference & Training Infrastructure",
    companyName: "OpenAI",
    companyDomain: "openai.com",
    logoText: "OA",
    location: "San Francisco, CA / Remote",
    workMode: "Hybrid" as const,
    salaryRange: "$270,000 – $360,000",
    atsProvider: "Ashby" as const,
    jobUrl: "https://jobs.ashbyhq.com/openai/9182-4112",
    discoveredAt: "12 mins ago",
    tags: ["Distributed Systems", "PyTorch", "CUDA", "C++", "High Concurrency", "Python"],
    descriptionSnippet: "Frontier systems engineer specializing in low-overhead collective communications and petabyte-scale training checkpointing.",
    companyTier: "S" as const,
    employeeCount: "1,500+",
  },
  {
    id: "disc-spot-01",
    jobTitle: "Staff Backend Engineer - Audio Streaming & Discovery Engine",
    companyName: "Spotify",
    companyDomain: "spotify.com",
    logoText: "SP",
    location: "Stockholm / New York / Remote",
    workMode: "Remote" as const,
    salaryRange: "$210,000 – $270,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/spotify/jobs/5201948",
    discoveredAt: "15 mins ago",
    tags: ["Distributed Systems", "Go", "Kafka", "Microservices", "gRPC", "Low Latency"],
    descriptionSnippet: "Scale high-performance event-driven streaming pipelines serving 600M+ active listeners with sub-100ms recommendation latency.",
    companyTier: "A" as const,
    employeeCount: "9,000+",
  },
  {
    id: "disc-atls-01",
    jobTitle: "Senior Full Stack Engineer - Jira Enterprise Cloud",
    companyName: "Atlassian",
    companyDomain: "atlassian.com",
    logoText: "AT",
    location: "Bengaluru, India / Sydney, Australia / Remote",
    workMode: "Remote" as const,
    salaryRange: "$190,000 – $250,000",
    atsProvider: "Lever" as const,
    jobUrl: "https://jobs.lever.co/atlassian/8210394",
    discoveredAt: "18 mins ago",
    tags: ["React", "TypeScript", "Next.js", "GraphQL", "Microservices", "Docker"],
    descriptionSnippet: "Develop resilient real-time collaboration engines and canvas components powering 300,000+ enterprise teams worldwide.",
    companyTier: "A" as const,
    employeeCount: "11,000+",
  },
  {
    id: "disc-cflr-01",
    jobTitle: "Senior Edge Infrastructure Engineer - Workers KV & R2",
    companyName: "Cloudflare",
    companyDomain: "cloudflare.com",
    logoText: "CF",
    location: "Austin, TX / London / Remote",
    workMode: "Remote" as const,
    salaryRange: "$200,000 – $260,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/cloudflare/jobs/4820192",
    discoveredAt: "22 mins ago",
    tags: ["Rust", "eBPF", "Distributed Systems", "DNS / BGP", "Distributed Caching"],
    descriptionSnippet: "Scale globally distributed key-value stores and edge caching across 300+ PoPs worldwide with Rust and eBPF.",
    companyTier: "A" as const,
    employeeCount: "3,800+",
  },
  {
    id: "disc-figm-01",
    jobTitle: "Systems Engineer - WebGL & Multiplayer Canvas Engine",
    companyName: "Figma",
    companyDomain: "figma.com",
    logoText: "FG",
    location: "San Francisco, CA / New York / Hybrid",
    workMode: "Hybrid" as const,
    salaryRange: "$220,000 – $280,000",
    atsProvider: "Ashby" as const,
    jobUrl: "https://jobs.ashbyhq.com/figma/6102-1823",
    discoveredAt: "25 mins ago",
    tags: ["TypeScript", "C++", "Rust", "WebAssembly", "CRDT Sync", "WebGL"],
    descriptionSnippet: "Design real-time CRDT synchronization protocols and GPU-accelerated rendering pipelines in C++ and WebAssembly.",
    companyTier: "A" as const,
    employeeCount: "2,000+",
  },
  {
    id: "disc-rzrp-01",
    jobTitle: "Lead Platform Engineer - Banking Core & UPI Switch",
    companyName: "Razorpay",
    companyDomain: "razorpay.com",
    logoText: "RZ",
    location: "Bengaluru, Karnataka, India",
    workMode: "Hybrid" as const,
    salaryRange: "₹45,00,000 – ₹70,00,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/razorpay/jobs/8201923",
    discoveredAt: "30 mins ago",
    tags: ["Go", "Distributed Systems", "Kafka", "PostgreSQL", "UPI Architecture", "High TPS"],
    descriptionSnippet: "Engineer high-frequency payment switches handling 10,000+ TPS with zero-downtime ledger consistency.",
    companyTier: "B" as const,
    employeeCount: "3,500+",
  },
  {
    id: "disc-post-01",
    jobTitle: "Staff Software Engineer - API Runtime & Mocking Engine",
    companyName: "Postman",
    companyDomain: "postman.com",
    logoText: "PM",
    location: "Bengaluru, India / San Francisco / Remote",
    workMode: "Remote" as const,
    salaryRange: "$180,000 – $230,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/postman/jobs/3820192",
    discoveredAt: "35 mins ago",
    tags: ["TypeScript", "Node.js", "Distributed Systems", "gRPC", "V8 Engine"],
    descriptionSnippet: "Scale the developer tool runtime used by 30+ million developers worldwide to design, test, and mock distributed APIs.",
    companyTier: "B" as const,
    employeeCount: "1,200+",
  },
  {
    id: "disc-supa-01",
    jobTitle: "Senior Database Engineer - Postgres Realtime & Edge Functions",
    companyName: "Supabase",
    companyDomain: "supabase.com",
    logoText: "SB",
    location: "Remote (Global)",
    workMode: "Remote" as const,
    salaryRange: "$170,000 – $220,000",
    atsProvider: "Ashby" as const,
    jobUrl: "https://jobs.ashbyhq.com/supabase/8192-3112",
    discoveredAt: "40 mins ago",
    tags: ["PostgreSQL", "Elixir", "Rust", "TypeScript", "Realtime WebSocket", "Docker"],
    descriptionSnippet: "Extend open-source PostgreSQL with replication daemons, tenant isolation, and WebAssembly runtime integration.",
    companyTier: "B" as const,
    employeeCount: "120",
  },
  {
    id: "disc-vrc-01",
    jobTitle: "Staff Edge Runtime Engineer - Next.js & Turbopack",
    companyName: "Vercel",
    companyDomain: "vercel.com",
    logoText: "VC",
    location: "Remote (Global)",
    workMode: "Remote" as const,
    salaryRange: "$190,000 – $250,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/vercel/jobs/5920192",
    discoveredAt: "45 mins ago",
    tags: ["Rust", "Next.js", "TypeScript", "V8 Isolates", "Edge Runtime"],
    descriptionSnippet: "Improve compilation speeds, bundler heuristics, and serverless compute primitives for modern web frameworks.",
    companyTier: "B" as const,
    employeeCount: "550",
  },
  {
    id: "disc-rsnd-01",
    jobTitle: "Full Stack Engineer - Email Infrastructure & SDKs",
    companyName: "Resend",
    companyDomain: "resend.com",
    logoText: "RS",
    location: "Remote (Global)",
    workMode: "Remote" as const,
    salaryRange: "$140,000 – $180,000",
    atsProvider: "Ashby" as const,
    jobUrl: "https://jobs.ashbyhq.com/resend/1029-4829",
    discoveredAt: "50 mins ago",
    tags: ["React", "Next.js", "TypeScript", "SMTP / DNS", "Serverless Edge"],
    descriptionSnippet: "Build clean, developer-friendly transactional email APIs and React email components for modern applications.",
    companyTier: "C" as const,
    employeeCount: "25",
  },
  {
    id: "disc-calc-01",
    jobTitle: "Senior Frontend Engineer - Open Source Scheduling",
    companyName: "Cal.com",
    companyDomain: "cal.com",
    logoText: "CC",
    location: "Remote (Global)",
    workMode: "Remote" as const,
    salaryRange: "$130,000 – $170,000",
    atsProvider: "Greenhouse" as const,
    jobUrl: "https://boards.greenhouse.io/calcom/jobs/2910283",
    discoveredAt: "1 hour ago",
    tags: ["TypeScript", "Next.js", "React", "Prisma", "TailwindCSS"],
    descriptionSnippet: "Create seamless calendar booking workflows, timezone algorithms, and video integration extensions.",
    companyTier: "C" as const,
    employeeCount: "40",
  },
];

export const INITIAL_DISCOVERED_JOBS: DiscoveredJob[] = RAW_DISCOVERED_JOBS.map((job) => {
  const chance = calculateSelectionChance(job, INITIAL_CANDIDATE_PROFILE);
  return {
    ...job,
    matchScore: chance.overallPercentage,
    selectionChance: chance,
  };
});

