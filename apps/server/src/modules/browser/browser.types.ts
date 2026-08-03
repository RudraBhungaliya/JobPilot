export interface BrowserSession {
    sessionId: string;

    userId: string;

    connected: boolean;

    createdAt: Date;
}

export interface BrowserLaunchOptions {
    headless?: boolean;

    slowMo?: number;
}

export interface BrowserPageInfo {
    url: string;

    title: string;
}

export interface JobPosting {
    title: string;

    company: string;

    location: string;

    description: string;

    url: string;

    platform:
        | "linkedin"
        | "greenhouse"
        | "lever"
        | "workday"
        | "ashby"
        | "indeed";
}