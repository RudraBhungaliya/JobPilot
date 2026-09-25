import { NextResponse } from "next/server";
import { INITIAL_APPLICATIONS, Application, inferCompanyTier } from "@/lib/mock-data";

// In-memory persistent state across requests in dev server
let memoryApplications: Application[] = [...INITIAL_APPLICATIONS];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: memoryApplications,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyName = body.companyName || body.company?.name || "Target Company";
    const companyDomain = body.companyDomain || body.company?.domain || "company.com";
    const tier = body.companyTier || body.company?.tier || inferCompanyTier(companyName, companyDomain);

    const newApplication: Application = {
      id: `app-${Date.now()}`,
      jobTitle: body.jobTitle || "Software Engineer",
      company: {
        id: `c-${Date.now()}`,
        name: companyName,
        domain: companyDomain,
        logoText: companyName.slice(0, 2).toUpperCase(),
        location: body.location || "San Francisco, CA / Remote",
        stage: body.company?.stage || "Growth",
        verifiedAts: body.atsProvider || "Greenhouse",
        tier: tier,
      },
      jobUrl: body.jobUrl || "https://boards.greenhouse.io",
      location: body.location || "San Francisco, CA / Remote",
      workMode: body.workMode || "Remote",
      salaryRange: body.salaryRange || "$180,000 - $240,000",
      status: body.status || "SAVED",
      matchScore: body.matchScore || 92,
      atsProvider: body.atsProvider || "Greenhouse",
      resumeVersionUsed: body.resumeVersionUsed || "Staff_Distributed_Systems_2026.pdf",
      lastUpdated: "Just now",
      humanActions: [],
      questions: [],
      tailoringNotes: {
        highlightedSkills: ["Distributed Systems", "TypeScript", "Go", "PostgreSQL"],
        customExecutiveSummary: "Ingested via JobPilot ATS Pipeline.",
        gapAnalysis: [],
      },
      telemetryLogs: [
        {
          timestamp: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
          level: "INFO",
          step: "APPLICATION_INGESTED",
          detail: `Added to ${body.status || "SAVED"} queue for automated pipeline tracking.`,
        },
      ],
    };

    memoryApplications = [newApplication, ...memoryApplications];

    return NextResponse.json({
      success: true,
      data: newApplication,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to create application",
      },
      { status: 400 }
    );
  }
}
