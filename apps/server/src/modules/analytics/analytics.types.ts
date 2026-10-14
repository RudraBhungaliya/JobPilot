export interface ConversionRates {
  discoveryToAppliedRate: number;      // (applied / discovered) * 100
  applicationToSubmittedRate: number;  // (submitted / totalApplied) * 100
  submissionVerificationRate: number;  // (verified / submitted) * 100
  submissionToInterviewRate: number;   // (interviews / submitted) * 100
  interviewToOfferRate: number;        // (offers / interviews) * 100
  overallFunnelConversion: number;     // (interviews + offers / totalApplications) * 100
}

export interface OverviewMetrics {
  discoveredJobs: number;
  totalApplications: number;
  queuedApplications: number;
  runningApplications: number;
  submittedApplications: number;
  verifiedSubmissions: number;
  failedApplications: number;
  waitingUserApplications: number;
  savedApplications: number;
  interviewsCount: number;
  offersCount: number;
  rejectedCount: number;
  activeLoopsCount: number;
  conversionRates: ConversionRates;
  dailyQuotaRemaining: number;
  dailyApplicationLimit: number;
}

export interface FunnelStage {
  stage: "DISCOVERED" | "SAVED" | "QUEUED" | "RUNNING" | "SUBMITTED" | "VERIFIED" | "INTERVIEW" | "OFFER";
  label: string;
  count: number;
  conversionFromPrevious: number;
  dropoffRate: number;
}

export interface SourceMetric {
  source: string;
  discovered: number;
  applied: number;
  submitted: number;
  successRate: number;
}

export interface TierMetric {
  tier: "S" | "A" | "B" | "C" | "Remote" | "Other";
  label: string;
  count: number;
  percentage: number;
}

export interface FailureReasonBreakdown {
  category: "HUMAN_VERIFICATION" | "CLOSED_POSTING" | "VALIDATION_ERROR" | "RATE_LIMITED" | "NETWORK_TIMEOUT" | "OTHER";
  reason: string;
  count: number;
  percentage: number;
}

export interface ActivityDataPoint {
  date: string; // YYYY-MM-DD
  discovered: number;
  applied: number;
  submitted: number;
  failed: number;
}

export interface RecordEventInput {
  type: "INTERVIEW_INVITE" | "OFFER_RECEIVED" | "REJECTION_RECEIVED";
  applicationId?: string;
  companyName?: string;
  notes?: string;
  metadata?: Record<string, any>;
}
