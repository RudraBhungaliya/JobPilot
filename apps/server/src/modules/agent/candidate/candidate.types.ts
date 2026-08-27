export interface CandidateContext {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;

    email?: string | null;
    phone?: string | null;

    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;

    currentTitle?: string | null;
    currentCompany?: string | null;

    yearsOfExperience?: number | null;

    expectedSalary?: number | null;
    currentSalary?: number | null;

    noticePeriod?: number | null;

    github?: string | null;
    linkedin?: string | null;
    portfolio?: string | null;
    website?: string | null;

    leetcode?: string | null;
    codeforces?: string | null;

    workMode?: string | null;
    employmentType?: string | null;

    willingToRelocate?: boolean | null;
    willingToTravel?: boolean | null;
    remoteOnly?: boolean | null;

    sponsorshipRequired?: boolean | null;

    visaStatus?: string | null;

    governmentEmployee?: boolean | null;
    militaryService?: boolean | null;
    veteran?: boolean | null;
    criminalRecord?: boolean | null;
    securityClearance?: boolean | null;
    disability?: boolean | null;

    summary?: string | null;

    skills: string[];
    languages: string[];
    certifications: string[];
    experiences: string[];
    education: string[];
    projects: string[];
}

export interface CandidateAnswer {
    value: string;
    source:
        | "PROFILE"
        | "RESUME"
        | "UNKNOWN";
    confidence:
        | "HIGH"
        | "MEDIUM"
        | "LOW";
}

export interface CandidateQuestion {
    label: string;
    name: string;
    type: string;
}