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