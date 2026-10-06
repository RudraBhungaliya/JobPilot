export interface CreateLoopDTO {
  name: string;
  targetCountries?: string[];
  targetLocations?: string[];
  targetJobTitles: string[];
  excludedCompanies?: string[];
  includedCompanies?: string[];
  remotePreference?: string;
  experienceLevel?: string;
  employmentTypes?: string[];
  minimumCompensation?: number;
  maximumCompensation?: number;
  targetTiers?: string[];
  autoApplyEnabled?: boolean;
  recruiterOutreachEnabled?: boolean;
  dailyApplicationLimit?: number;
  dailyDiscoveryLimit?: number;
  priorityStrategy?: string;
  resumeId?: string;
}

export interface UpdateLoopDTO extends Partial<CreateLoopDTO> {
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ERROR";
}
