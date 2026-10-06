import profileService from "../../profile/profile.service.js";

import resumeService from "../../resume/resume.service.js";

import type { CandidateContext } from "./candidate.types.js";

class CandidateService {
  async buildContext(
    userId: string,
    resumeId?: string,
  ): Promise<CandidateContext> {
    const profile = await profileService.getProfile(userId);

    const { prisma } = await import("@jobpilot/database");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }).catch(() => null);

    const resume = resumeId ? await resumeService.getResume(resumeId) : null;

    const profileSkills = profile?.skills?.map((skill) => skill.name) ?? [];
    const resumeSkills = resume?.extractedText
      ? (await import("../../resume/resume.parser.js")).default.parse(resume.extractedText).skills
      : [];

    const mergedSkills = Array.from(new Set([...profileSkills, ...resumeSkills]));

    const experiences = (profile?.experiences as any) ?? [];
    const educations = (profile?.educations as any) ?? [];
    const profileProjects = (profile?.profileProjects as any) ?? [];
    const profileLinks = (profile?.profileLinks as any) ?? [];

    const latestExp = experiences.length > 0 ? experiences[0] : null;
    const currentCompany = profile?.currentCompany || latestExp?.company || null;
    const currentTitle = profile?.currentTitle || latestExp?.title || null;

    const resolvedEmail = profile?.email || user?.email || null;

    // Detect phone country code if applicable
    let phoneCountryCode: string | null = null;
    if (profile?.phone && profile.phone.startsWith("+")) {
      const match = profile.phone.match(/^\+(\d{1,3})/);
      if (match) phoneCountryCode = `+${match[1]}`;
    } else if (profile?.country?.toLowerCase() === "india") {
      phoneCountryCode = "+91";
    } else if (profile?.country?.toLowerCase() === "united states" || profile?.country?.toLowerCase() === "usa") {
      phoneCountryCode = "+1";
    }

    return {
      firstName: profile?.firstName,
      middleName: profile?.middleName,
      lastName: profile?.lastName,
      preferredName: profile?.firstName,
      pronouns: profile?.gender === "Male" ? "He/Him" : profile?.gender === "Female" ? "She/Her" : null,

      email: resolvedEmail,
      phone: profile?.phone,
      phoneCountryCode,
      secondaryPhone: null,

      dateOfBirth: profile?.dateOfBirth,
      gender: profile?.gender,
      race: null,
      ethnicity: null,
      veteranStatus: profile?.veteran ? "Yes" : "No",
      disabilityStatus: profile?.disability ? "Yes" : "No",
      nationality: profile?.nationality || profile?.country,

      address: profile?.address,
      addressLine2: null,
      city: profile?.city,
      state: profile?.state,
      country: profile?.country,
      zipCode: profile?.zipCode,

      currentTitle,
      currentCompany,

      yearsOfExperience: profile?.yearsOfExperience,
      expectedSalary: profile?.expectedSalary,
      currentSalary: profile?.currentSalary,
      salaryCurrency: profile?.country?.toLowerCase() === "india" ? "INR" : "USD",

      noticePeriod: profile?.noticePeriod,
      availableStartDate: profile?.noticePeriod === 0 ? "Immediate" : profile?.noticePeriod ? `${profile.noticePeriod} days` : "2 weeks",

      github: profile?.github,
      linkedin: profile?.linkedin,
      portfolio: profile?.portfolio,
      website: profile?.website,
      twitter: null,
      stackoverflow: null,
      kaggle: null,
      dribbble: null,
      behance: null,

      leetcode: profile?.leetcode,
      codeforces: profile?.codeforces,

      workMode: profile?.workMode,
      employmentType: profile?.employmentType,

      willingToRelocate: profile?.willingToRelocate,
      willingToTravel: profile?.willingToTravel,
      remoteOnly: profile?.remoteOnly,

      sponsorshipRequired: profile?.sponsorshipRequired,
      workAuthorization: profile?.sponsorshipRequired === false ? "Authorized" : null,
      visaStatus: profile?.visaStatus,

      is18OrOlder: true,
      previousEmployee: false,
      nonCompeteAgreement: false,

      governmentEmployee: profile?.governmentEmployee,
      militaryService: profile?.militaryService,
      veteran: profile?.veteran,
      criminalRecord: profile?.criminalRecord,
      securityClearance: profile?.securityClearance,
      disability: profile?.disability,

      summary: profile?.summary,
      resumeText: resume?.extractedText,

      skills: mergedSkills.map((name) => ({ name })),
      languages: (profile?.languages as any) ?? [],
      certifications: (profile?.certifications as any) ?? [],
      experiences,
      educations,
      profileProjects,
      profileLinks,

      education:
        educations.map(
          (education: any) =>
            `${education.degree} - ${education.institution}${education.fieldOfStudy ? ` (${education.fieldOfStudy})` : ""}`,
        ),
      projects:
        profileProjects.map(
          (project: any) => `${project.title}: ${project.description ?? ""}`,
        ),
    };
  }
}

export default new CandidateService();
