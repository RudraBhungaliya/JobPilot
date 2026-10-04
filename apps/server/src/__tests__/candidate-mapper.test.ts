import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mapper from "../modules/agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../modules/agent/candidate/candidate.types.js";

const richContext: CandidateContext = {
  firstName: "Rahul",
  middleName: "Kumar",
  lastName: "Sharma",
  email: "rahul.sharma@example.com",
  phone: "+91-98765-43210",
  dateOfBirth: "1995-05-15",
  gender: "Male",
  nationality: "Indian",
  address: "123 Tech Park, Sector 21",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  zipCode: "560021",
  currentTitle: "Senior Software Engineer",
  currentCompany: "Google India Pvt Ltd",
  yearsOfExperience: 6.5,
  expectedSalary: 3500000,
  currentSalary: 2400000,
  noticePeriod: 60,
  github: "https://github.com/rahulsharma",
  linkedin: "https://linkedin.com/in/rahulsharma",
  portfolio: "https://rahulsharma.dev",
  website: "https://rahulsharma.me",
  leetcode: "rahulsharma_95",
  codeforces: "rahul_s",
  workMode: "HYBRID",
  employmentType: "FULL_TIME",
  willingToRelocate: true,
  willingToTravel: true,
  remoteOnly: false,
  sponsorshipRequired: false,
  visaStatus: "H1B Approved",
  governmentEmployee: false,
  militaryService: false,
  veteran: false,
  criminalRecord: false,
  securityClearance: true,
  disability: false,
  summary:
    "Senior Software Engineer with 6+ years building scalable distributed systems. Expert in Node.js, Go, and cloud infrastructure. Passionate about mentoring and open-source contributions.",
  skills: [
    { name: "TypeScript", category: "Language", level: "Expert", yearsOfExperience: 5 },
    { name: "Node.js", category: "Runtime", level: "Expert", yearsOfExperience: 6 },
    { name: "React", category: "Frontend", level: "Advanced", yearsOfExperience: 4 },
    { name: "Go", category: "Language", level: "Advanced", yearsOfExperience: 3 },
    { name: "PostgreSQL", category: "Database", level: "Expert", yearsOfExperience: 6 },
    { name: "Redis", category: "Cache", level: "Advanced", yearsOfExperience: 5 },
    { name: "AWS", category: "Cloud", level: "Advanced", yearsOfExperience: 5 },
    { name: "Docker", category: "DevOps", level: "Advanced", yearsOfExperience: 4 },
    { name: "Kubernetes", category: "Orchestration", level: "Intermediate", yearsOfExperience: 3 },
    { name: "GraphQL", category: "API", level: "Advanced", yearsOfExperience: 4 },
  ],
  languages: [
    { name: "English", proficiency: "Fluent" },
    { name: "Hindi", proficiency: "Native" },
    { name: "French", proficiency: "Intermediate" },
  ],
  certifications: [
    { name: "AWS Certified Solutions Architect - Associate", issuer: "Amazon", credentialId: "AWS-SAA-12345" },
    { name: "Certified Kubernetes Application Developer", issuer: "CNCF", credentialId: "CKAD-67890" },
  ],
  educations: [
    {
      degree: "Master of Technology (M.Tech)",
      institution: "Indian Institute of Science (IISc)",
      fieldOfStudy: "Computer Science",
      grade: "8.9/10",
      endDate: "2020-06-30",
      currentlyStudying: false,
    },
    {
      degree: "Bachelor of Engineering (B.E.)",
      institution: "BMS College of Engineering",
      fieldOfStudy: "Information Science",
      grade: "9.2/10",
      endDate: "2018-06-30",
      currentlyStudying: false,
    },
    {
      degree: "Class 12th",
      institution: "Delhi Public School",
      fieldOfStudy: "Science (PCM)",
      grade: "95%",
      endDate: "2014-06-30",
      currentlyStudying: false,
    },
  ],
  experiences: [
    {
      company: "Google India Pvt Ltd",
      title: "Senior Software Engineer",
      location: "Bengaluru, India",
      description: "Led the design of a distributed recommendation pipeline serving 10M DAU.",
      employmentType: "FULL_TIME",
      startDate: "2022-04-01",
      currentlyWorking: true,
    },
    {
      company: "Flipkart Internet Pvt Ltd",
      title: "Software Engineer 2",
      location: "Bengaluru, India",
      description: "Built core checkout APIs handling 200k requests per minute during sales.",
      employmentType: "FULL_TIME",
      startDate: "2020-07-01",
      endDate: "2022-03-31",
      currentlyWorking: false,
    },
    {
      company: "Infosys Ltd",
      title: "Systems Engineer",
      location: "Pune, India",
      description: "Developed enterprise microservices for a banking client.",
      employmentType: "FULL_TIME",
      startDate: "2018-07-01",
      endDate: "2020-06-30",
      currentlyWorking: false,
    },
  ],
  profileProjects: [
    {
      title: "DistributedKV - Open-Source Distributed Key-Value Store",
      description: "A Raft-based KV store in Go with 2k+ GitHub stars.",
      githubUrl: "https://github.com/rahulsharma/distributedkv",
      liveUrl: "https://distributedkv.dev",
      technologies: "Go, Raft, gRPC, Docker",
    },
    {
      title: "Realtime Analytics Dashboard",
      description: "Sub-second analytics over 1B events using ClickHouse + React.",
      githubUrl: "https://github.com/rahulsharma/realtime-analytics",
      technologies: "ClickHouse, TypeScript, React, WebSocket",
    },
  ],
  profileLinks: [
    { label: "YouTube Channel", url: "https://youtube.com/@rahulsharma" },
    { label: "Medium Blog", url: "https://medium.com/@rahulsharma" },
  ],
};

interface TestCase {
  name: string;
  fieldName: string;
  label: string;
  expectNonEmpty: boolean;
}

const testCases: TestCase[] = [
  { name: "first name", fieldName: "firstName", label: "First Name", expectNonEmpty: true },
  { name: "middle name", fieldName: "middleName", label: "Middle Name", expectNonEmpty: true },
  { name: "last name", fieldName: "lastName", label: "Last Name", expectNonEmpty: true },
  { name: "full name combined", fieldName: "fullName", label: "Full Name", expectNonEmpty: true },
  { name: "applicant name", fieldName: "applicant", label: "Applicant Name", expectNonEmpty: true },
  { name: "email", fieldName: "email", label: "Email Address", expectNonEmpty: true },
  { name: "phone mobile", fieldName: "phone", label: "Mobile Number", expectNonEmpty: true },
  { name: "contact telephone", fieldName: "telephone", label: "Contact Number", expectNonEmpty: true },
  { name: "date of birth", fieldName: "dateOfBirth", label: "Date of Birth", expectNonEmpty: true },
  { name: "dob short", fieldName: "dob", label: "DOB", expectNonEmpty: true },
  { name: "birthday", fieldName: "birthday", label: "Birthday", expectNonEmpty: true },
  { name: "gender", fieldName: "gender", label: "Gender", expectNonEmpty: true },
  { name: "sex", fieldName: "sex", label: "Sex", expectNonEmpty: true },
  { name: "nationality", fieldName: "nationality", label: "Nationality", expectNonEmpty: true },
  { name: "citizenship", fieldName: "citizenship", label: "Country of Citizenship", expectNonEmpty: true },
  { name: "marital status empty", fieldName: "maritalStatus", label: "Marital Status", expectNonEmpty: false },
  { name: "full street address", fieldName: "address", label: "Full Street Address", expectNonEmpty: true },
  { name: "residential address", fieldName: "residentialAddress", label: "Residential Address", expectNonEmpty: true },
  { name: "address line 1", fieldName: "addressLine1", label: "Address Line", expectNonEmpty: true },
  { name: "house number", fieldName: "houseNo", label: "House Number", expectNonEmpty: true },
  { name: "city town", fieldName: "city", label: "City / Town", expectNonEmpty: true },
  { name: "state province", fieldName: "state", label: "State / Province", expectNonEmpty: true },
  { name: "country nation", fieldName: "country", label: "Country", expectNonEmpty: true },
  { name: "zip postal code", fieldName: "zipCode", label: "Zip / Postal Code", expectNonEmpty: true },
  { name: "pin code", fieldName: "pincode", label: "Pin Code", expectNonEmpty: true },
  { name: "current employer", fieldName: "currentEmployer", label: "Current Employer", expectNonEmpty: true },
  { name: "current company organization", fieldName: "organization", label: "Current Company / Organization", expectNonEmpty: true },
  { name: "present company", fieldName: "presentCompany", label: "Present Company", expectNonEmpty: true },
  { name: "current title role", fieldName: "currentTitle", label: "Current Title / Role", expectNonEmpty: true },
  { name: "position designation", fieldName: "position", label: "Position / Designation", expectNonEmpty: true },
  { name: "job title", fieldName: "jobTitle", label: "Job Title", expectNonEmpty: true },
  { name: "years of experience", fieldName: "yearsOfExperience", label: "Years of Experience", expectNonEmpty: true },
  { name: "total experience", fieldName: "totalExperience", label: "Total Experience", expectNonEmpty: true },
  { name: "overall experience years", fieldName: "overallExp", label: "Overall Work Experience (years)", expectNonEmpty: true },
  { name: "notice period", fieldName: "noticePeriod", label: "Notice Period (days)", expectNonEmpty: true },
  { name: "how much notice", fieldName: "notice", label: "How much notice do you need?", expectNonEmpty: true },
  { name: "joining time", fieldName: "joiningTime", label: "Joining Time", expectNonEmpty: true },
  { name: "expected salary CTC", fieldName: "expectedSalary", label: "Expected CTC / Salary", expectNonEmpty: true },
  { name: "compensation expectations", fieldName: "compensation", label: "Compensation Expectations", expectNonEmpty: true },
  { name: "desired salary", fieldName: "desiredSalary", label: "Desired Salary", expectNonEmpty: true },
  { name: "current salary current CTC", fieldName: "currentSalary", label: "Current CTC / Salary", expectNonEmpty: true },
  { name: "present salary pay", fieldName: "presentSalary", label: "Present Salary / Pay", expectNonEmpty: true },
  { name: "hourly rate expected", fieldName: "hourlyRate", label: "Expected Hourly Rate", expectNonEmpty: true },
  { name: "sponsorship required H1B", fieldName: "sponsorshipRequired", label: "Do you require sponsorship / H1B?", expectNonEmpty: true },
  { name: "need visa work sponsorship", fieldName: "visaSponsor", label: "Need Visa / Work Sponsorship?", expectNonEmpty: true },
  { name: "work mode preference", fieldName: "workMode", label: "Work Mode / Remote Preference", expectNonEmpty: true },
  { name: "work from home arrangement", fieldName: "workArrangement", label: "Work Arrangement (WFH/Hybrid/Onsite)", expectNonEmpty: true },
  { name: "remote only", fieldName: "remoteOnly", label: "Remote Only?", expectNonEmpty: true },
  { name: "employment type job type", fieldName: "employmentType", label: "Employment Type / Job Type", expectNonEmpty: true },
  { name: "full time part time contract", fieldName: "jobType", label: "Full Time / Part Time / Contract", expectNonEmpty: true },
  { name: "authorized to work in India", fieldName: "workEligibilityIndia", label: "Are you authorized to work in India?", expectNonEmpty: true },
  { name: "authorized to work in US", fieldName: "workEligibilityUS", label: "Authorized to work in US / USA?", expectNonEmpty: true },
  { name: "general work eligibility", fieldName: "workEligibility", label: "Work Eligibility / Legal to Work", expectNonEmpty: true },
  { name: "rehire eligibility empty", fieldName: "rehireEligible", label: "Eligible for Rehire?", expectNonEmpty: false },
  { name: "visa status immigration", fieldName: "visaStatus", label: "Visa Status / Immigration Status", expectNonEmpty: true },
  { name: "willing to relocate", fieldName: "willingToRelocate", label: "Willing to Relocate?", expectNonEmpty: true },
  { name: "ready to move cities", fieldName: "relocate", label: "Ready to move / Open to Relocate?", expectNonEmpty: true },
  { name: "willing to travel", fieldName: "willingToTravel", label: "Willing to Travel?", expectNonEmpty: true },
  { name: "open to travel required ok", fieldName: "travelOk", label: "Travel Required? OK / Open to Travel", expectNonEmpty: true },
  { name: "available start date from notice", fieldName: "startDate", label: "Available Start Date / When can you join?", expectNonEmpty: true },
  { name: "joining date availability", fieldName: "joiningDate", label: "Joining Date / Date of Availability", expectNonEmpty: true },
  { name: "criminal record felony convictions", fieldName: "criminalRecord", label: "Criminal Record / Felony / Convictions?", expectNonEmpty: true },
  { name: "military service served", fieldName: "militaryService", label: "Military Service / Served in Military?", expectNonEmpty: true },
  { name: "veteran status", fieldName: "veteran", label: "Are you a Veteran / Protected Veteran?", expectNonEmpty: true },
  { name: "disability disabled", fieldName: "disability", label: "Disability / Do you have a disability?", expectNonEmpty: true },
  { name: "government employee PSU", fieldName: "governmentEmployee", label: "Government Employee / PSU?", expectNonEmpty: true },
  { name: "security clearance level", fieldName: "securityClearance", label: "Security Clearance / Have Clearance?", expectNonEmpty: true },
  { name: "leetcode username", fieldName: "leetcode", label: "Leetcode Username / Profile", expectNonEmpty: true },
  { name: "codeforces handle", fieldName: "codeforces", label: "Codeforces Handle / Profile", expectNonEmpty: true },
  { name: "github profile url", fieldName: "githubProfile", label: "GitHub Profile URL", expectNonEmpty: true },
  { name: "linkedin profile link", fieldName: "linkedinProfile", label: "LinkedIn Profile / Link", expectNonEmpty: true },
  { name: "portfolio site link", fieldName: "portfolioSite", label: "Link to Portfolio Site", expectNonEmpty: true },
  { name: "personal website url", fieldName: "personalWebsite", label: "Personal Website / Blog URL", expectNonEmpty: true },
  { name: "summary professional about me", fieldName: "summary", label: "Professional Summary / About Me", expectNonEmpty: true },
  { name: "personal statement objective", fieldName: "objective", label: "Personal Statement / Objective", expectNonEmpty: true },
  { name: "referral referred by empty", fieldName: "referral", label: "Referred By / Who referred you?", expectNonEmpty: false },
  { name: "highest degree qualification", fieldName: "highestDegree", label: "Highest Degree / Qualification", expectNonEmpty: true },
  { name: "educational qualification degree", fieldName: "education", label: "Education / Educational Qualification", expectNonEmpty: true },
  { name: "university college institution", fieldName: "institution", label: "University / College / Institution", expectNonEmpty: true },
  { name: "name of university school", fieldName: "universityName", label: "Name of University / School", expectNonEmpty: true },
  { name: "field of study major specialization", fieldName: "fieldOfStudy", label: "Field of Study / Major / Specialization", expectNonEmpty: true },
  { name: "branch subject stream", fieldName: "branch", label: "Branch / Subject / Stream", expectNonEmpty: true },
  { name: "graduation year passing", fieldName: "graduationYear", label: "Graduation Year / Year of Passing", expectNonEmpty: true },
  { name: "passed out year completed", fieldName: "yearOfPassing", label: "Year of Passing / Completed", expectNonEmpty: true },
  { name: "GPA grade marks CGPA", fieldName: "gpa", label: "GPA / Grade / Marks / CGPA", expectNonEmpty: true },
  { name: "percentage academic performance", fieldName: "percentage", label: "Percentage / Academic Performance", expectNonEmpty: true },
  { name: "top skills primary skillset", fieldName: "topSkills", label: "Top Skills / Primary Skillset", expectNonEmpty: true },
  { name: "relevant skills core technical", fieldName: "relevantSkills", label: "Relevant Skills / Core Technical", expectNonEmpty: true },
  { name: "skills technologies known", fieldName: "skills", label: "Skills / Technologies Known", expectNonEmpty: true },
  { name: "languages known spoken", fieldName: "languagesKnown", label: "Languages Known / Spoken", expectNonEmpty: true },
  { name: "spoken languages native", fieldName: "spokenLanguages", label: "Spoken Languages / Native Tongue", expectNonEmpty: true },
  { name: "certifications certified professional", fieldName: "certifications", label: "Certifications / Professional Certifications", expectNonEmpty: true },
  { name: "certified courses", fieldName: "certified", label: "Certified / Certificates / Courses", expectNonEmpty: true },
  { name: "notable projects past done", fieldName: "projects", label: "Projects / Notable Projects Done", expectNonEmpty: true },
  { name: "list of projects significant", fieldName: "projectList", label: "List of Projects / Significant Projects", expectNonEmpty: true },
  { name: "experience summary overview", fieldName: "experienceSummary", label: "Experience Summary / Work Overview", expectNonEmpty: true },
  { name: "career overview employment history", fieldName: "careerOverview", label: "Career Overview / Employment History", expectNonEmpty: true },
];

describe("CandidateMapper", () => {
  it(`should have >= 60 test cases`, () => {
    assert.ok(testCases.length >= 60, `Expected >=60 test cases, got ${testCases.length}`);
  });

  it(`should have >=55/60 non-empty values for the seeded context`, () => {
    const results = testCases.map((tc) => {
      const ans = mapper.resolve(tc.fieldName, tc.label, richContext);
      return { testCase: tc, answer: ans };
    });

    const nonEmptyCount = results.filter((r) => r.answer.value !== "").length;
    const knownSourceCount = results.filter((r) => r.answer.source !== "UNKNOWN").length;

    console.log("--- CandidateMapper Test Summary ---");
    console.log(`Total test cases: ${testCases.length}`);
    console.log(`Non-empty value count: ${nonEmptyCount}/${testCases.length}`);
    console.log(`Known source count:   ${knownSourceCount}/${testCases.length}`);

    for (const r of results) {
      const status =
        r.answer.value !== "" ? "OK" : r.testCase.expectNonEmpty ? "MISSING" : "EMPTY(EXPECTED)";
      console.log(
        `  [${status}] ${r.testCase.name.padEnd(42)} -> value=${JSON.stringify(r.answer.value).slice(0, 60).padEnd(62)} source=${r.answer.source}`,
      );
    }

    assert.ok(
      nonEmptyCount >= 55,
      `Expected >=55 non-empty values, got ${nonEmptyCount}/${testCases.length}`,
    );
  });

  it("should return PROFILE source with HIGH confidence for canonical scalar matches", () => {
    const canonicalFields: Array<[string, string]> = [
      ["firstName", "First Name"],
      ["lastName", "Last Name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["city", "City"],
      ["country", "Country"],
    ];
    for (const [fn, lb] of canonicalFields) {
      const ans = mapper.resolve(fn, lb, richContext);
      assert.equal(ans.source, "PROFILE", `${fn}/${lb} source should be PROFILE`);
      assert.equal(ans.confidence, "HIGH", `${fn}/${lb} confidence should be HIGH`);
      assert.ok(ans.value.length > 0, `${fn}/${lb} value should be non-empty`);
    }
  });

  it("should combine first+middle+last for full name field", () => {
    const ans = mapper.resolve("fullName", "Full Name", richContext);
    assert.ok(ans.value.includes("Rahul"), "should include first name");
    assert.ok(ans.value.includes("Kumar"), "should include middle name");
    assert.ok(ans.value.includes("Sharma"), "should include last name");
    assert.equal(ans.source, "PROFILE");
  });

  it("should combine address parts into full address string", () => {
    const ans = mapper.resolve("address", "Full Street Address", richContext);
    assert.ok(ans.value.includes("Tech Park"), "should include address line");
    assert.ok(ans.value.includes("Bengaluru"), "should include city");
    assert.ok(ans.value.includes("Karnataka"), "should include state");
    assert.ok(ans.value.includes("560021"), "should include zip");
    assert.ok(ans.value.includes("India"), "should include country");
  });

  it("should pick latest education degree/institution for education questions", () => {
    const deg = mapper.resolve("highestDegree", "Highest Degree", richContext);
    assert.ok(deg.value.includes("M.Tech") || deg.value.includes("Master"), "should pick latest master degree");

    const inst = mapper.resolve("institution", "University / Institution", richContext);
    assert.ok(inst.value.includes("IISc") || inst.value.includes("Indian Institute of Science"), "should pick latest university");
  });

  it("should return top 10 skill names comma-separated", () => {
    const ans = mapper.resolve("topSkills", "Top Skills", richContext);
    assert.ok(ans.value.includes("TypeScript"));
    assert.ok(ans.value.includes("Node.js"));
    assert.ok(ans.value.includes("AWS"));
    assert.ok(ans.value.includes("Kubernetes"));
  });

  it("should return languages joined by comma", () => {
    const ans = mapper.resolve("languagesKnown", "Languages Known", richContext);
    assert.ok(ans.value.includes("English"));
    assert.ok(ans.value.includes("Hindi"));
    assert.ok(ans.value.includes("French"));
  });

  it("should return certifications comma separated", () => {
    const ans = mapper.resolve("certifications", "Certifications", richContext);
    assert.ok(ans.value.includes("AWS Certified Solutions Architect"));
    assert.ok(ans.value.includes("Kubernetes Application Developer"));
  });

  it("should return top 3 project titles separated by semicolon", () => {
    const ans = mapper.resolve("projects", "Projects", richContext);
    assert.ok(ans.value.includes("DistributedKV"));
    assert.ok(ans.value.includes("Realtime Analytics"));
  });

  it("should return first 3 experience lines summary", () => {
    const ans = mapper.resolve("experienceSummary", "Experience Summary", richContext);
    assert.ok(ans.value.includes("Senior Software Engineer at Google"));
    assert.ok(ans.value.includes("Software Engineer 2 at Flipkart"));
    assert.ok(ans.value.includes("Systems Engineer at Infosys"));
  });

  it("should return available start date as notice period days string", () => {
    const ans = mapper.resolve("startDate", "When can you join?", richContext);
    assert.ok(ans.value.includes("60"));
    assert.ok(ans.value.toLowerCase().includes("day"));
  });

  it("should return Immediate when noticePeriod=0 for available start date", () => {
    const ctx: CandidateContext = { ...richContext, noticePeriod: 0 };
    const ans = mapper.resolve("startDate", "When can you join?", ctx);
    assert.equal(ans.value.toLowerCase(), "immediate");
  });

  it("should return empty UNKNOWN for fields with no profile data (maritalStatus, referral, rehire)", () => {
    const marital = mapper.resolve("maritalStatus", "Marital Status", richContext);
    assert.equal(marital.value, "");
    assert.equal(marital.source, "UNKNOWN");

    const referral = mapper.resolve("referral", "Referred By", richContext);
    assert.equal(referral.value, "");
    assert.equal(referral.source, "UNKNOWN");

    const rehire = mapper.resolve("rehireEligible", "Eligible for Rehire?", richContext);
    assert.equal(rehire.value, "");
    assert.equal(rehire.source, "UNKNOWN");
  });

  it("should derive hourly rate from annual expectedSalary", () => {
    const ans = mapper.resolve("hourlyRate", "Expected Hourly Rate", richContext);
    assert.ok(ans.value.length > 0, "hourly should be derived");
    const val = Number(ans.value);
    assert.ok(Number.isFinite(val) && val > 0, "hourly should be a positive number");
  });

  it("should return Yes for authorized to work in India when country/nationality matches", () => {
    const ans = mapper.resolve("workEligibilityIndia", "Are you authorized to work in India?", richContext);
    assert.equal(ans.value, "Yes");
  });

  it("should not invent values when context lacks data", () => {
    const emptyCtx: CandidateContext = {};
    const ans = mapper.resolve("firstName", "First Name", emptyCtx);
    assert.equal(ans.value, "");
    assert.equal(ans.source, "UNKNOWN");

    const ans2 = mapper.resolve("skills", "Skills", emptyCtx);
    assert.equal(ans2.value, "");
    assert.equal(ans2.source, "UNKNOWN");
  });
});
