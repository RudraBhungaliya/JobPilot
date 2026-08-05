export type EmploymentType =
    | "FULL_TIME"
    | "PART_TIME"
    | "CONTRACT"
    | "INTERNSHIP";

export type WorkMode =
    | "REMOTE"
    | "HYBRID"
    | "ONSITE";

export interface CandidateProfile {
    id: string;

    userId: string;

    firstName: string;

    middleName?: string;

    lastName: string;

    phone: string;

    dateOfBirth?: Date;

    nationality?: string;

    gender?: string;

    currentTitle?: string;

    currentCompany?: string;

    yearsOfExperience?: number;

    github?: string;

    linkedin?: string;

    portfolio?: string;

    website?: string;

    codeforces?: string;

    leetcode?: string;

    workMode: WorkMode;

    employmentType: EmploymentType;

    createdAt: Date;

    updatedAt: Date;
}