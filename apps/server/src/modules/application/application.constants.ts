import type { ApplicationStatus, CompanyTier } from "./application.types.js";

export const APPLICATION = {
    MAX_RETRIES: 3,
    DEFAULT_BATCH_SIZE: 10,
    MAX_CONCURRENT_APPLICATIONS: 3,
} as const;

export const PIPELINE_STAGES: readonly ApplicationStatus[] = [
    "SAVED",
    "TAILORING",
    "WAITING_FOR_USER",
    "QUEUED",
    "RUNNING",
    "SUBMITTED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
] as const;

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

export const VALID_STAGE_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    DISCOVERED: ["SAVED", "MATCHED", "TAILORING", "QUEUED", "SKIPPED", "ARCHIVED", "REJECTED"],
    SAVED: ["TAILORING", "WAITING_FOR_USER", "QUEUED", "REVIEW_REQUIRED", "READY_TO_SUBMIT", "REJECTED", "ARCHIVED", "SKIPPED"],
    PENDING: ["SAVED", "TAILORING", "MATCHED", "WAITING_FOR_USER", "QUEUED", "REJECTED", "ARCHIVED", "FAILED"],
    MATCHED: ["TAILORING", "WAITING_FOR_USER", "QUEUED", "REVIEW_REQUIRED", "READY_TO_SUBMIT", "REJECTED", "SKIPPED", "ARCHIVED"],
    TAILORING: ["WAITING_FOR_USER", "QUEUED", "REVIEW_REQUIRED", "READY_TO_SUBMIT", "RUNNING", "REJECTED", "FAILED", "WITHDRAWN"],
    REVIEW_REQUIRED: ["READY_TO_SUBMIT", "QUEUED", "WAITING_FOR_USER", "REJECTED", "SKIPPED", "ARCHIVED", "WITHDRAWN"],
    WAITING_FOR_USER: ["QUEUED", "READY_TO_SUBMIT", "SUBMITTING", "RUNNING", "REJECTED", "FAILED", "WITHDRAWN"],
    QUEUED: ["RUNNING", "SUBMITTING", "TAILORING", "WAITING_FOR_USER", "SUBMITTED", "APPLIED", "REJECTED", "FAILED", "RETRYING", "WITHDRAWN"],
    READY_TO_SUBMIT: ["QUEUED", "SUBMITTING", "RUNNING", "WAITING_FOR_USER", "SUBMITTED", "APPLIED", "REJECTED", "FAILED", "WITHDRAWN"],
    SUBMITTING: ["SUBMITTED", "APPLIED", "VERIFICATION_PENDING", "WAITING_FOR_USER", "FAILED", "RETRYING", "REJECTED"],
    RUNNING: ["SUBMITTED", "APPLIED", "SUBMITTING", "VERIFICATION_PENDING", "WAITING_FOR_USER", "FAILED", "RETRYING", "REJECTED"],
    SUBMITTED: ["VERIFICATION_PENDING", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    VERIFICATION_PENDING: ["APPLIED", "SUBMITTED", "WAITING_FOR_USER", "FAILED", "REJECTED", "WITHDRAWN"],
    APPLIED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    OFFER: ["REJECTED", "WITHDRAWN", "ARCHIVED"],
    REJECTED: ["SAVED", "QUEUED", "ARCHIVED"],
    FAILED: ["QUEUED", "RETRYING", "REJECTED", "ARCHIVED"],
    RETRYING: ["QUEUED", "RUNNING", "SUBMITTING", "WAITING_FOR_USER", "FAILED", "REJECTED"],
    WITHDRAWN: ["SAVED", "QUEUED", "ARCHIVED"],
    ARCHIVED: ["SAVED", "QUEUED"],
    SKIPPED: ["QUEUED", "SAVED", "REJECTED", "ARCHIVED"],
};

export function isValidStageTransition(currentStatus: ApplicationStatus, nextStatus: ApplicationStatus): boolean {
    if (currentStatus === nextStatus) return true;
    const allowed = VALID_STAGE_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(nextStatus);
}