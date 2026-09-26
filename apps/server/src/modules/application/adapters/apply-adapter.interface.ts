export type ApplyResult = {
  success: boolean;
  confirmationId?: string;
  requiresBrowserFallback: boolean;
  reason?: string;
};

export type ApplyAdapterInput = {
  jobUrl: string;
  userId: string;
  applicationId: string;
  profile?: any;
  resume?: any;
  resumeBuffer?: Uint8Array;
  resumeContentType?: string;
  job?: any;
  atsProvider?: string;
};

export interface ApplyAdapter {
  name: string;
  canApply(url: string, atsProvider?: string): boolean;
  apply(input: ApplyAdapterInput): Promise<ApplyResult>;
}
