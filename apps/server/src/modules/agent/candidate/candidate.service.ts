import profileService from "../../profile/profile.service.js";

import resumeService from "../../resume/resume.service.js";

import type { CandidateContext } from "./candidate.types.js";

class CandidateService {
  async buildContext(
    userId: string,
    resumeId?: string,
  ): Promise<CandidateContext> {
    const profile = await profileService.getProfile(userId);

    const resume = resumeId ? await resumeService.getResume(resumeId) : null;

    return {
      firstName: profile?.firstName,

      middleName: profile?.middleName,

      lastName: profile?.lastName,

      email: profile?.email,

      phone: profile?.phone,

      address: profile?.address,

      city: profile?.city,

      state: profile?.state,

      country: profile?.country,

      zipCode: profile?.zipCode,

      currentTitle: profile?.currentTitle,

      currentCompany: profile?.currentCompany,

      yearsOfExperience: profile?.yearsOfExperience,

      expectedSalary: profile?.expectedSalary,

      currentSalary: profile?.currentSalary,

      noticePeriod: profile?.noticePeriod,

      github: profile?.github,

      linkedin: profile?.linkedin,

      portfolio: profile?.portfolio,

      website: profile?.website,

      leetcode: profile?.leetcode,

      codeforces: profile?.codeforces,

      workMode: profile?.workMode,

      employmentType: profile?.employmentType,

      willingToRelocate: profile?.willingToRelocate,

      willingToTravel: profile?.willingToTravel,

      remoteOnly: profile?.remoteOnly,

      sponsorshipRequired: profile?.sponsorshipRequired,

      visaStatus: profile?.visaStatus,

      governmentEmployee: profile?.governmentEmployee,

      militaryService: profile?.militaryService,

      veteran: profile?.veteran,

      criminalRecord: profile?.criminalRecord,

      securityClearance: profile?.securityClearance,

      disability: profile?.disability,

      summary: profile?.summary,

      skills: profile?.skills?.map((skill) => skill.name) ?? [],

      languages: profile?.languages?.map((language) => language.name) ?? [],

      certifications:
        profile?.certifications?.map((certification) => certification.name) ??
        [],

      experiences:
        profile?.experiences?.map(
          (experience) =>
            `${experience.title} at ${experience.company}: ${experience.description ?? ""}`,
        ) ?? [],

      education:
        profile?.educations?.map(
          (education) =>
            `${education.degree} - ${education.institution}${education.fieldOfStudy ? ` (${education.fieldOfStudy})` : ""}`,
        ) ?? [],

      projects:
        profile?.profileProjects?.map(
          (project) => `${project.title}: ${project.description ?? ""}`,
        ) ?? [],
    };
  }
}

export default new CandidateService();
