export interface ProfileSkill {
    name: string;
    category?: string | null;
    level?: string | null;
    yearsOfExperience?: number | null;
}

export interface ProfileEducation {
    degree: string;
    institution: string;
    fieldOfStudy?: string | null;
    grade?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    currentlyStudying?: boolean | null;
}

export interface ProfileExperience {
    company: string;
    title: string;
    location?: string | null;
    description?: string | null;
    employmentType?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    currentlyWorking?: boolean | null;
}

export interface ProfileLanguage {
    name: string;
    proficiency?: string | null;
}

export interface ProfileCertification {
    name: string;
    issuer?: string | null;
    credentialId?: string | null;
    credentialUrl?: string | null;
    issuedAt?: Date | string | null;
    expiresAt?: Date | string | null;
}

export interface ProfileProject {
    title: string;
    description?: string | null;
    githubUrl?: string | null;
    liveUrl?: string | null;
    technologies?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
}

export interface ProfileLink {
    label: string;
    url: string;
}

export interface CandidateContext {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;

    email?: string | null;
    phone?: string | null;

    dateOfBirth?: Date | string | null;

    gender?: string | null;
    nationality?: string | null;

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
    resumeText?: string | null;

    skills?: ProfileSkill[];
    languages?: ProfileLanguage[];
    certifications?: ProfileCertification[];
    experiences?: ProfileExperience[];
    educations?: ProfileEducation[];
    profileProjects?: ProfileProject[];
    profileLinks?: ProfileLink[];
    education?: string[];
    projects?: string[];
}

export interface CandidateAnswer {
    value: string;
    source:
        | "PROFILE"
        | "RESUME"
        | "INFERRED"
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
