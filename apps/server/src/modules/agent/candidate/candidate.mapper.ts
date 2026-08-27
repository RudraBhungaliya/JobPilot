import type { CandidateAnswer, CandidateContext } from "./candidate.types.js";

class CandidateMapper {
  resolve(
    fieldName: string,
    label: string,
    context: CandidateContext,
  ): CandidateAnswer {
    const key = `${fieldName} ${label}`.toLowerCase().trim();

    if (/first.?name|given.?name/.test(key) && context.firstName) {
      return {
        value: context.firstName,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/middle.?name/.test(key) && context.middleName) {
      return {
        value: context.middleName,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/last.?name|surname|family.?name/.test(key) && context.lastName) {
      return {
        value: context.lastName,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/email|e-mail/.test(key) && context.email) {
      return {
        value: context.email,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/phone|mobile|telephone/.test(key) && context.phone) {
      return {
        value: context.phone,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/^city$|city|town/.test(key) && context.city) {
      return {
        value: context.city,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/state|province|region/.test(key) && context.state) {
      return {
        value: context.state,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/country|nation/.test(key) && context.country) {
      return {
        value: context.country,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/zip|postal/.test(key) && context.zipCode) {
      return {
        value: context.zipCode,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/github/.test(key) && context.github) {
      return {
        value: context.github,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/linkedin/.test(key) && context.linkedin) {
      return {
        value: context.linkedin,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/portfolio/.test(key) && context.portfolio) {
      return {
        value: context.portfolio,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/website|personal.?site/.test(key) && context.website) {
      return {
        value: context.website,
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (
      /experience|years.*experience/.test(key) &&
      context.yearsOfExperience != null
    ) {
      return {
        value: String(context.yearsOfExperience),
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/notice.*period/.test(key) && context.noticePeriod != null) {
      return {
        value: String(context.noticePeriod),
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (
      /salary|compensation|expected.*pay/.test(key) &&
      context.expectedSalary != null
    ) {
      return {
        value: String(context.expectedSalary),
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (/relocat/.test(key) && context.willingToRelocate != null) {
      return {
        value: String(context.willingToRelocate),
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    if (
      /sponsor|visa sponsorship/.test(key) &&
      context.sponsorshipRequired != null
    ) {
      return {
        value: String(context.sponsorshipRequired),
        source: "PROFILE",
        confidence: "HIGH",
      };
    }

    return {
      value: "",
      source: "UNKNOWN",
      confidence: "LOW",
    };
  }
}

export default new CandidateMapper();
