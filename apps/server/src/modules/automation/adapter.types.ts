export type AdapterPlatform =
    | "GREENHOUSE"
    | "LEVER"
    | "WORKDAY"
    | "ASHBY"
    | "SMARTRECRUITERS"
    | "ICIMS"
    | "JOBVITE"
    | "BAMBOOHR"
    | "TALEO"
    | "UNKNOWN";

export interface ApplicationPayload {
    firstName: string;

    lastName: string;

    email: string;

    phone: string;

    resumePath: string;

    coverLetter?: string;
}

export interface ApplicationResult {
    success: boolean;

    message: string;

    platform: AdapterPlatform;
}