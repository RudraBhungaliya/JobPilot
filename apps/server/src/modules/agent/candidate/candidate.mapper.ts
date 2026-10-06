import type { CandidateAnswer, CandidateContext } from "./candidate.types.js";

class CandidateMapper {
  resolve(
    fieldName: string,
    label: string,
    context: CandidateContext,
  ): CandidateAnswer {
    const key = `${fieldName} ${label}`.toLowerCase().trim();

    if (/first.?name|given.?name/.test(key) && context.firstName) {
      return { value: context.firstName, source: "PROFILE", confidence: "HIGH" };
    }

    if (/middle.?name/.test(key) && context.middleName) {
      return { value: context.middleName, source: "PROFILE", confidence: "HIGH" };
    }

    if (/last.?name|surname|family.?name/.test(key) && context.lastName) {
      return { value: context.lastName, source: "PROFILE", confidence: "HIGH" };
    }

    if (/full.?name|complete.?name|applicant.?name|candidate.?name|\bname\b.*(applicant|candidate|employee|person)|(applicant|candidate|employee|person).*\bname\b/.test(key)
        && (context.firstName || context.lastName)) {
      const parts = [context.firstName, context.middleName, context.lastName]
        .filter(Boolean) as string[];
      return { value: parts.join(" "), source: "PROFILE", confidence: "HIGH" };
    }

    if (/email|e-mail|electronic.?mail/.test(key) && context.email) {
      return { value: context.email, source: "PROFILE", confidence: "HIGH" };
    }

    if (/phone|mobile|telephone|contact.?number|cell.?phone/.test(key) && context.phone) {
      return { value: context.phone, source: "PROFILE", confidence: "HIGH" };
    }

    if (/date.?of.?birth|\bdob\b|birth.?date|birthday|birth.?day/.test(key) && context.dateOfBirth) {
      const d = context.dateOfBirth instanceof Date
        ? context.dateOfBirth
        : new Date(context.dateOfBirth);
      if (!isNaN(d.getTime())) {
        return { value: d.toISOString().slice(0, 10), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\bgender\b|\bsex\b|gender.?identity/.test(key) && context.gender) {
      return { value: context.gender, source: "PROFILE", confidence: "HIGH" };
    }

    if (/nationality|citizenship|country.?of.?citizenship/.test(key) && context.nationality) {
      return { value: context.nationality, source: "PROFILE", confidence: "HIGH" };
    }

    if (/marital.?status|married|marital/.test(key)) {
      return { value: "", source: "UNKNOWN", confidence: "LOW" };
    }

    if (/street.?address|full.?address|complete.?address|residential.?address/.test(key)) {
      const parts = [context.address, context.city, context.state, context.zipCode, context.country]
        .filter(Boolean) as string[];
      if (parts.length > 0) {
        return { value: parts.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\baddress\b|address.?line|address1|house.?no|house.?number|flat.?no|plot.?no/.test(key) && context.address) {
      return { value: context.address, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bcity\b|\btown\b|municipality/.test(key) && context.city) {
      return { value: context.city, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bstate\b|\bprovince\b|\bregion\b/.test(key) && context.state) {
      return { value: context.state, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bcountry\b|\bnation\b|\bnational\b|country.?of.?residence/.test(key) && context.country) {
      return { value: context.country, source: "PROFILE", confidence: "HIGH" };
    }

    if (/zip|postal|pin.?code|pincode/.test(key) && context.zipCode) {
      return { value: context.zipCode, source: "PROFILE", confidence: "HIGH" };
    }

    if (/current.?employer|current.?company|\borganization\b|\bemployer\b|company.?name|present.?company|working.?at|where.?do.?you.?work/.test(key) && context.currentCompany) {
      return { value: context.currentCompany, source: "PROFILE", confidence: "HIGH" };
    }

    if (/current.?title|current.?role|job.?title|\bposition\b|designation|current.?designation|present.?role|what.?is.?your.?role|role.?title/.test(key) && context.currentTitle) {
      return { value: context.currentTitle, source: "PROFILE", confidence: "HIGH" };
    }

    if (/years.?of.?experience|years.?experience|total.?experience|overall.?experience|experience.?years|how.?many.?years.*experience|work.?experience.*years/.test(key) && context.yearsOfExperience != null) {
      return { value: String(context.yearsOfExperience), source: "PROFILE", confidence: "HIGH" };
    }

    if (/notice.?period|\bnotice\b|how.?much.?notice|joining.?time|availability.?to.?join.*days|notice.?time|how.?long.?notice|period.?of.?notice/.test(key) && context.noticePeriod != null) {
      return { value: String(context.noticePeriod), source: "PROFILE", confidence: "HIGH" };
    }

    if (/expected.?salary|expected.?ctc|\bctc\b|compensation.?expectations|salary.?expectations|expected.?pay|expected.?compensation|desired.?salary|how.?much.?salary.*expect|pay.?expectations/.test(key) && context.expectedSalary != null) {
      return { value: String(context.expectedSalary), source: "PROFILE", confidence: "HIGH" };
    }

    if (/current.?salary|current.?ctc|current.?pay|present.?salary|present.?ctc|existing.?salary|current.?income|current.?compensation/.test(key) && context.currentSalary != null) {
      return { value: String(context.currentSalary), source: "PROFILE", confidence: "HIGH" };
    }

    if (/salary.?expectations.?hourly|hourly.?rate.?expected|hourly.?salary|per.?hour.?rate|expected.?hourly/.test(key)) {
      if (context.expectedSalary != null) {
        const hourly = Math.round(context.expectedSalary / (52 * 40));
        return { value: String(hourly), source: "PROFILE", confidence: "MEDIUM" };
      }
    }

    if (/sponsorship.?required|need.?visa|do.?you.?require.?sponsorship|work.?visa.?needed|h1b|h-1b|visa.?sponsor|require.?visa|need.?sponsorship|visa.?required/.test(key) && context.sponsorshipRequired != null) {
      return { value: context.sponsorshipRequired ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/remote.?preference|work.?mode|work.?from.?office.*remote|work.?location.?preference|onsite.*hybrid.*remote|work.?arrangement|work.?setting|preferred.?work.?mode|where.?do.?you.?prefer.?to.?work|wfh|work.?from.?home/.test(key) && context.workMode) {
      return { value: context.workMode, source: "PROFILE", confidence: "HIGH" };
    }

    if (/remote.?only|only.?remote|100.?remote|fully.?remote/.test(key) && context.remoteOnly != null) {
      return { value: context.remoteOnly ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/employment.?type|job.?type|full.?time.*part.?time.*contract|type.?of.?employment|nature.?of.?employment|employment.?status|fulltime|part-time|contract.*type/.test(key) && context.employmentType) {
      return { value: context.employmentType, source: "PROFILE", confidence: "HIGH" };
    }

    if (/authorized.?to.?work.*india|are.?you.?authorized.*india|legally.?authorized.*india|work.?eligibility.*india|eligible.?to.?work.*india|can.?you.?work.*india/.test(key)) {
      if (context.country?.toLowerCase() === "india" || context.nationality?.toLowerCase() === "indian") {
        return { value: "Yes", source: "PROFILE", confidence: "MEDIUM" };
      }
      return { value: "Yes", source: "INFERRED", confidence: "LOW" };
    }

    if (/authorized.?to.?work.*(us|usa|united.?states|america)|are.?you.?authorized.*(us|usa|states)|work.?eligibility.*(us|usa)|eligible.?to.?work.*(us|usa)|can.?you.?work.*(us|usa|united.?states)/.test(key)) {
      if (context.visaStatus || context.country?.toLowerCase().includes("united") || context.country?.toLowerCase() === "usa" || context.country?.toLowerCase() === "us") {
        return { value: context.visaStatus || "Yes", source: "PROFILE", confidence: "MEDIUM" };
      }
      return { value: context.sponsorshipRequired === false ? "Yes" : "No", source: "INFERRED", confidence: "LOW" };
    }

    if (/work.?eligibility|eligibility.?to.?work|legal.?to.?work|authorized.?to.?work|eligible.?for.?employment|right.?to.?work/.test(key)) {
      if (context.workAuthorization || context.visaStatus || context.country || context.nationality) {
        return { value: context.workAuthorization || context.visaStatus || "Yes", source: "PROFILE", confidence: "MEDIUM" };
      }
      return { value: "Yes", source: "INFERRED", confidence: "LOW" };
    }

    if (/rehire.?eligibility|eligible.?for.?rehire|will.?past.?employer.?rehire|re.?hire|rehireable/.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "LOW" };
    }

    if (/visa.?status|immigration.?status|current.?visa|visa.?type|immigration|what.?is.?your.?visa|visa.?held/.test(key) && context.visaStatus) {
      return { value: context.visaStatus, source: "PROFILE", confidence: "HIGH" };
    }

    if (/willing.?to.?relocate|ready.?to.?relocate|open.?to.?move|open.?to.?relocate|relocation|can.?you.?relocate|are.?you.?willing.*move|ready.?to.?move.*cities/.test(key) && context.willingToRelocate != null) {
      return { value: context.willingToRelocate ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/willing.?to.?travel|open.?to.?travel|travel.?required.?ok|are.?you.?willing.*travel|can.?you.?travel|travel.?availability|travelling.?allowed/.test(key) && context.willingToTravel != null) {
      return { value: context.willingToTravel ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/available.?start.?date|when.?can.?you.?join|joining.?date|date.?of.?availability|start.?date|available.?date|from.?when.?can.?you.?join|join.?date|availability.?date/.test(key)) {
      if (context.availableStartDate) {
        return { value: context.availableStartDate, source: "PROFILE", confidence: "HIGH" };
      }
      if (context.noticePeriod != null) {
        if (context.noticePeriod === 0) {
          return { value: "Immediate", source: "PROFILE", confidence: "MEDIUM" };
        }
        return { value: `${context.noticePeriod} days`, source: "PROFILE", confidence: "MEDIUM" };
      }
    }

    if (/criminal.?record|convictions|felony|ever.?convicted|criminal.?history|have.?you.?been.?convicted|background.*record/.test(key) && context.criminalRecord != null) {
      return { value: context.criminalRecord ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/military.?service|served.?in.?military|veteran.?status.*military|armed.?forces|served.?military|military.?background/.test(key) && context.militaryService != null) {
      return { value: context.militaryService ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bveteran\b|are.?you.?a.?veteran|protected.?veteran|veteran.?status|us.?veteran|disabled.?veteran/.test(key) && context.veteran != null) {
      return { value: context.veteran ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/disability|disabled|do.?you.?have.?a.?disability|handicap|differently.?abled|physical.?disability/.test(key) && context.disability != null) {
      return { value: context.disability ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/government.?employee|current.?govt.?employee|psu.?employee|govt.?job|government.?service|public.?sector.*employee|state.?government/.test(key) && context.governmentEmployee != null) {
      return { value: context.governmentEmployee ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/security.?clearance|have.?clearance|government.?clearance|clearance.?level|security.?level|background.?clearance|do.?you.?have.?clearance/.test(key) && context.securityClearance != null) {
      return { value: context.securityClearance ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bleetcode\b|leetcode.?username|leetcode.?profile|leetcode.?handle|leetcode.?link/.test(key) && context.leetcode) {
      return { value: context.leetcode, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bcodeforces\b|codeforces.?handle|codeforces.?profile|codeforces.?username|codeforces.?link/.test(key) && context.codeforces) {
      return { value: context.codeforces, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bgithub\b|github.?profile|github.?url|github.?link|github.?username|github.?account|git.?hub/.test(key) && context.github) {
      return { value: context.github, source: "PROFILE", confidence: "HIGH" };
    }

    if (/linkedin.?url|linkedin.?profile|linkedin.?link|linkedin.?account|link.?to.?linkedin|social.?profile.*linkedin|linkedin.?page/.test(key) && context.linkedin) {
      return { value: context.linkedin, source: "PROFILE", confidence: "HIGH" };
    }

    if (/portfolio.?site|link.?to.?portfolio|portfolio.?url|portfolio.?link|online.?portfolio|digital.?portfolio/.test(key) && context.portfolio) {
      return { value: context.portfolio, source: "PROFILE", confidence: "HIGH" };
    }

    if (/website.?url|personal.?website|personal.?site|web.?site|blog|official.?site|my.?website/.test(key) && context.website) {
      return { value: context.website, source: "PROFILE", confidence: "HIGH" };
    }

    if (/experience.?summary|work.?experience.?overview|relevant.?experience|career.?overview|work.?history|brief.?experience|summary.?of.?experience|employment.?history/.test(key)) {
      if (context.experiences && context.experiences.length > 0) {
        const lines = context.experiences.slice(0, 3).map((e) => {
          return `${e.title} at ${e.company}`;
        });
        return { value: lines.join("; "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/summary|professional.?summary|about.?me|personal.?statement|objective|profile.?summary|career.?summary|self.?summary/.test(key) && context.summary) {
      return { value: context.summary, source: "PROFILE", confidence: "HIGH" };
    }

    if (/referral|referral.?name|who.?referred.?you|referred.?by|referral.?source|how.?did.?you.?hear|reference.?name/.test(key)) {
      return { value: "", source: "UNKNOWN", confidence: "LOW" };
    }

    if (/highest.?degree|\beducation\b|\bdegree\b|highest.?qualification|educational.?qualification|qualification|what.?is.?your.?degree|latest.?degree|maximum.?education/.test(key)) {
      if (context.educations && context.educations.length > 0) {
        const sorted = [...context.educations].sort((a, b) => {
          if (a.currentlyStudying && !b.currentlyStudying) return -1;
          if (!a.currentlyStudying && b.currentlyStudying) return 1;
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        return { value: sorted[0].degree, source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\buniversity\b|\bcollege\b|\bschool\b|\binstitution\b|name.?of.?university|college.?name|school.?name|which.?university|where.?did.?you.?study|educational.?institution/.test(key)) {
      if (context.educations && context.educations.length > 0) {
        const sorted = [...context.educations].sort((a, b) => {
          if (a.currentlyStudying && !b.currentlyStudying) return -1;
          if (!a.currentlyStudying && b.currentlyStudying) return 1;
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        return { value: sorted[0].institution, source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/field.?of.?study|major|specialization|branch|what.?did.?you.?study|subject|stream|area.?of.?study/.test(key)) {
      if (context.educations && context.educations.length > 0) {
        const sorted = [...context.educations].sort((a, b) => {
          if (a.currentlyStudying && !b.currentlyStudying) return -1;
          if (!a.currentlyStudying && b.currentlyStudying) return 1;
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        if (sorted[0].fieldOfStudy) {
          return { value: sorted[0].fieldOfStudy, source: "PROFILE", confidence: "HIGH" };
        }
      }
    }

    if (/graduation.?year|year.?of.?passing|passing.?year|graduated|grad.?year|which.?year.*graduate|year.?of.?completion|completed.?year/.test(key)) {
      if (context.educations && context.educations.length > 0) {
        const sorted = [...context.educations].sort((a, b) => {
          if (a.currentlyStudying && !b.currentlyStudying) return -1;
          if (!a.currentlyStudying && b.currentlyStudying) return 1;
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        if (sorted[0].endDate) {
          const d = new Date(sorted[0].endDate);
          if (!isNaN(d.getTime())) {
            return { value: String(d.getFullYear()), source: "PROFILE", confidence: "HIGH" };
          }
        }
      }
    }

    if (/\bgpa\b|grade|marks|cgpa|percentage|scores|academic.?performance|what.?is.?your.?gpa|marks.?obtained/.test(key)) {
      if (context.educations && context.educations.length > 0) {
        const sorted = [...context.educations].sort((a, b) => {
          if (a.currentlyStudying && !b.currentlyStudying) return -1;
          if (!a.currentlyStudying && b.currentlyStudying) return 1;
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          return bEnd - aEnd;
        });
        if (sorted[0].grade) {
          return { value: sorted[0].grade, source: "PROFILE", confidence: "HIGH" };
        }
      }
    }

    if (/top.?skills|primary.?skills|skillset|relevant.?skills|key.?skills|core.?skills|technical.?skills|skills.?known|what.?are.?your.?skills|main.?skills/.test(key)) {
      if (context.skills && context.skills.length > 0) {
        const names = context.skills.slice(0, 10).map((s) => s.name);
        return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\bskills\b|\bskill\b|technologies.*known|tech.?stack|tools.*known|technology.?stack/.test(key)) {
      if (context.skills && context.skills.length > 0) {
        const names = context.skills.slice(0, 10).map((s) => s.name);
        return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/languages.?known|languages.?spoken|language.?skills|which.?languages|languages.?you.*speak|communication.?languages|spoken.?languages/.test(key)) {
      if (context.languages && context.languages.length > 0) {
        const names = context.languages.map((l) => l.name);
        return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\blanguages\b|\blanguage\b|mother.?tongue|native.?language/.test(key)) {
      if (context.languages && context.languages.length > 0) {
        const names = context.languages.map((l) => l.name);
        return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/certifications|certified|professional.?certifications|certificates|have.?certification|certification.*details|courses.?certified/.test(key)) {
      if (context.certifications && context.certifications.length > 0) {
        const names = context.certifications.map((c) => c.name);
        return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/projects|notable.?projects|past.?projects|list.?of.?projects|projects.?done|significant.?projects|academic.?projects/.test(key)) {
      if (context.profileProjects && context.profileProjects.length > 0) {
        const titles = context.profileProjects.slice(0, 3).map((p) => p.title);
        return { value: titles.join("; "), source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/preferred.?name|nickname|called.?by/i.test(key) && context.preferredName) {
      return { value: context.preferredName, source: "PROFILE", confidence: "HIGH" };
    }

    if (/pronouns|gender.*pronoun|preferred.*pronoun/i.test(key) && context.pronouns) {
      return { value: context.pronouns, source: "PROFILE", confidence: "HIGH" };
    }

    if (/address.?line.?2|apt|suite|unit|building|floor/i.test(key) && context.addressLine2) {
      return { value: context.addressLine2, source: "PROFILE", confidence: "HIGH" };
    }

    if (/country.?code|phone.?code|dialing.?code/i.test(key) && context.phoneCountryCode) {
      return { value: context.phoneCountryCode, source: "PROFILE", confidence: "HIGH" };
    }

    if (/secondary.?phone|alternate.?phone|home.?phone/i.test(key) && context.secondaryPhone) {
      return { value: context.secondaryPhone, source: "PROFILE", confidence: "HIGH" };
    }

    if (/twitter|twitter.?handle|x\.com|x.?handle/i.test(key) && context.twitter) {
      return { value: context.twitter, source: "PROFILE", confidence: "HIGH" };
    }

    if (/stack.?overflow|stackoverflow/i.test(key) && context.stackoverflow) {
      return { value: context.stackoverflow, source: "PROFILE", confidence: "HIGH" };
    }

    if (/kaggle|kaggle.?profile|kaggle.?url/i.test(key) && context.kaggle) {
      return { value: context.kaggle, source: "PROFILE", confidence: "HIGH" };
    }

    if (/dribbble|dribbble.?profile/i.test(key) && context.dribbble) {
      return { value: context.dribbble, source: "PROFILE", confidence: "HIGH" };
    }

    if (/behance|behance.?profile/i.test(key) && context.behance) {
      return { value: context.behance, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\b(race|ethnicity|ethnic.?origin|racial.?origin)\b/i.test(key)) {
      if (context.race || context.ethnicity) {
        return { value: context.race || context.ethnicity || "", source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\bveteran.?status|protected.?veteran.?status|military.?veteran.?status/i.test(key)) {
      if (context.veteranStatus) {
        return { value: context.veteranStatus, source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/\bdisability.?status|voluntary.?disability|disability.?disclosure/i.test(key)) {
      if (context.disabilityStatus) {
        return { value: context.disabilityStatus, source: "PROFILE", confidence: "HIGH" };
      }
    }

    if (/18.?years|at.?least.?18|age.?of.?majority|legal.?age|are.?you.?18/i.test(key)) {
      if (context.is18OrOlder != null) {
        return { value: context.is18OrOlder ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
      }
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/previously.?employed|worked.?for.*before|prior.?employee|ever.?worked.?at|former.?employee/i.test(key)) {
      if (context.previousEmployee != null) {
        return { value: context.previousEmployee ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
      }
      return { value: "No", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/non.?compete|restrictive.?covenant|non.?solicitation|confidentiality.?agreement/i.test(key)) {
      if (context.nonCompeteAgreement != null) {
        return { value: context.nonCompeteAgreement ? "Yes" : "No", source: "PROFILE", confidence: "HIGH" };
      }
      return { value: "No", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/work.?auth|authorization.*status|legal.*authorization/i.test(key) && context.workAuthorization) {
      return { value: context.workAuthorization, source: "PROFILE", confidence: "HIGH" };
    }

    if (/currency|salary.?currency|pay.?currency/i.test(key) && context.salaryCurrency) {
      return { value: context.salaryCurrency, source: "PROFILE", confidence: "HIGH" };
    }

    if (/available.?start.?date|earliest.?start|start.?date.?available/i.test(key) && context.availableStartDate) {
      return { value: context.availableStartDate, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bsalary\b.*\bhistory\b|previous.*salary|past.*compensation/i.test(key)) {
      if (context.currentSalary != null) return { value: String(context.currentSalary), source: "PROFILE", confidence: "HIGH" };
      return { value: "", source: "UNKNOWN", confidence: "LOW" };
    }

    if (/linkedin.*profile|linkedin.*url|linkedin.*handle|linkedin.*link|linkedin.*page/i.test(key) && context.linkedin) {
      return { value: context.linkedin, source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bportfolio\b.*\blink\b|portfolio.*url|portfolio.*site|online.*portfolio/i.test(key) && context.portfolio) {
      return { value: context.portfolio, source: "PROFILE", confidence: "HIGH" };
    }

    if (/personal.*website|personal.*site|my.*website|personal.*blog/i.test(key) && context.website) {
      return { value: context.website, source: "PROFILE", confidence: "HIGH" };
    }

    if (/background.*check|background.*authorization|consent.*background/i.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/\bdrug.*test\b|drug.*screen|consent.*drug/i.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/e.?verify|e verify|employment.*eligibility|verify.*eligibility/i.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/terms.*accept|accept.*terms|agree.*terms|terms.*conditions|privacy.*policy.*agree/i.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/\bovertime\b|willing.*overtime|available.*overtime|flexible.*hours|work.*weekends/i.test(key)) {
      return { value: "Yes", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/email.*opt.*in|marketing.*email|newsletter|receive.*updates|subscribe.*email/i.test(key)) {
      return { value: "No", source: "INFERRED", confidence: "MEDIUM" };
    }

    if (/\bdiversity\b|\bdei\b|equal.*opportunity|eeo|affirmative.*action.*voluntary/i.test(key)) {
      if (context.race || context.gender || context.ethnicity) {
        return { value: context.race || context.gender || "", source: "PROFILE", confidence: "HIGH" };
      }
      return { value: "", source: "UNKNOWN", confidence: "LOW" };
    }

    if (/\bprotector.*veteran|disabled.*veteran|recently.*separated.*veteran|armed.*forces.*service.*medal/i.test(key) && context.veteran != null) {
      return { value: String(context.veteran), source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bcertifications?\b|certified|professional.*certifications?|have.*certification/i.test(key) && context.certifications && context.certifications.length > 0) {
      const names = context.certifications.map((c) => c.name);
      return { value: names.join(", "), source: "PROFILE", confidence: "HIGH" };
    }

    if (/\bprojects\b|notable.*projects|past.*projects|list.*projects|projects.*done/i.test(key) && context.profileProjects && context.profileProjects.length > 0) {
      const titles = context.profileProjects.slice(0, 3).map((p) => p.title);
      return { value: titles.join("; "), source: "PROFILE", confidence: "HIGH" };
    }

    return { value: "", source: "UNKNOWN", confidence: "LOW" };
  }
}

export default new CandidateMapper();
