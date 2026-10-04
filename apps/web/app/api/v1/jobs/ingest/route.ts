import { NextResponse } from "next/server";
import { inferCompanyTier, calculateSelectionChance, INITIAL_CANDIDATE_PROFILE } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, message: "A valid job URL is required." }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    let atsProvider: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Custom" = "Custom";
    let companyName = "Company";
    let jobTitle = "Software Engineer";
    let location = "San Francisco, CA / Remote";
    let description = "Live ingested job role via JobPilot ATS crawler.";

    // 1. Detect ATS type and extract company / job IDs
    if (/greenhouse\.io/i.test(trimmedUrl)) {
      atsProvider = "Greenhouse";
      const match = trimmedUrl.match(/boards(?:\.greenhouse|\-api\.greenhouse)?\.io\/(?:embed\/job_board\/)?([^/\?]+)/i);
      if (match && match[1]) {
        companyName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    } else if (/lever\.co/i.test(trimmedUrl)) {
      atsProvider = "Lever";
      const match = trimmedUrl.match(/jobs\.lever\.co\/([^/\?]+)/i);
      if (match && match[1]) {
        companyName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    } else if (/ashbyhq\.com/i.test(trimmedUrl)) {
      atsProvider = "Ashby";
      const match = trimmedUrl.match(/jobs\.ashbyhq\.com\/([^/\?]+)/i);
      if (match && match[1]) {
        companyName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    } else if (/myworkdayjobs\.com/i.test(trimmedUrl)) {
      atsProvider = "Workday";
      const match = trimmedUrl.match(/https?:\/\/([^.]+)\.wd\d*\.myworkdayjobs\.com/i);
      if (match && match[1]) {
        companyName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }

    // 2. Fetch the live page HTML to extract live title and content
    try {
      const pageRes = await fetch(trimmedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml",
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const rawTitle = titleMatch[1].replace(/ - Job Board| - Careers| \| .*$/i, "").trim();
          if (rawTitle) jobTitle = rawTitle;
        }

        // Extract location if present
        const locMatch = html.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)<\//i);
        if (locMatch && locMatch[1]) {
          location = locMatch[1].trim();
        }

        // Extract meta description
        const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (metaDescMatch && metaDescMatch[1]) {
          description = metaDescMatch[1].trim();
        }
      }
    } catch {
      // Proceed with extracted metadata if direct fetch is blocked by CORS/firewall
    }

    let domain = "company.com";
    try {
      domain = new URL(trimmedUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = `${companyName.toLowerCase()}.com`;
    }

    const tier = inferCompanyTier(companyName, domain);
    const tags = ["Distributed Systems", "TypeScript", "Full Stack", "Cloud", "API"];

    const chance = calculateSelectionChance(
      {
        jobTitle,
        descriptionSnippet: description,
        tags,
        location,
        companyTier: tier,
      },
      INITIAL_CANDIDATE_PROFILE
    );

    const parsedJob = {
      id: `live-${Date.now()}`,
      jobTitle,
      company: {
        id: `c-${Date.now()}`,
        name: companyName,
        domain,
        logoText: companyName.slice(0, 2).toUpperCase(),
        location,
        stage: "Established Growth",
        verifiedAts: atsProvider,
        tier,
      },
      jobUrl: trimmedUrl,
      location,
      workMode: /remote/i.test(location) ? "Remote" : "Hybrid",
      salaryRange: tier === "S" ? "$240,000 – $320,000" : tier === "A" ? "$200,000 – $270,000" : "$160,000 – $220,000",
      status: "SAVED" as const,
      matchScore: chance.overallPercentage,
      atsProvider,
      resumeVersionUsed: "Staff_Distributed_Systems_2026.pdf",
      lastUpdated: "Just now",
      tags,
      description,
      selectionChance: chance,
      verifiedLive: true,
      humanActions: [],
      questions: [
        {
          id: "q1",
          label: "Years of experience with distributed backend systems and high TPS architecture?",
          field: "experience_years",
          type: "text",
          aiProposedValue: "6+ years building distributed services handling 20,000+ RPS with Kafka, Go, and PostgreSQL.",
          confidence: 96,
          isFlaggedForReview: false,
        },
        {
          id: "q2",
          label: "Are you legally authorized to work in the target job location without sponsorship?",
          field: "work_authorization",
          type: "boolean",
          aiProposedValue: "Yes",
          confidence: 99,
          isFlaggedForReview: false,
        },
      ],
      tailoringNotes: {
        highlightedSkills: ["Distributed Systems", "Go", "TypeScript", "PostgreSQL", "Kubernetes"],
        customExecutiveSummary: `Engineered tailored application package for ${companyName} aligning 6+ years experience in distributed architectures.`,
        gapAnalysis: [],
      },
      telemetryLogs: [
        {
          timestamp: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
          level: "INFO",
          step: "ATS_URL_PARSED",
          detail: `Parsed ${atsProvider} schema for ${companyName}. Ready for automated form-filling.`,
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: parsedJob,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to ingest job URL." },
      { status: 500 }
    );
  }
}
