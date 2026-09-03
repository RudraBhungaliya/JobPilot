export interface ResumeExtractionResult {
    extractedText: string;
    skills: string[];
    experience: string[];
    education: string[];
    projects: string[];
    workAuthorization: string[];
    sponsorship: string[];
}

export interface ResumeUploadResult {
    id: string;
    title: string;
    fileUrl: string;
    originalName: string;
    extraction: ResumeExtractionResult;
}