export const BROWSER_CONSTANTS = {
    DEFAULT_TIMEOUT: 30000,

    DEFAULT_NAVIGATION_TIMEOUT: 60000,

    SCREENSHOT_DIR: "uploads/screenshots",

    DOWNLOAD_DIR: "uploads/downloads",
} as const;

export const JOB_SOURCES = [
    "linkedin",
    "greenhouse",
    "lever",
    "workday",
    "ashby",
    "indeed",
] as const;