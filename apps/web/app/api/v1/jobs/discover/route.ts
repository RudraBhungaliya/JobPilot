import { NextResponse } from "next/server";
import { calculateSelectionChance, INITIAL_CANDIDATE_PROFILE } from "@/lib/mock-data";

export interface LiveJobItem {
  externalId: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  source: "greenhouse" | "lever" | "ashby" | "workday";
  tier?: "S" | "A" | "B" | "C";
  salaryRange?: string;
  tags: string[];
}

interface TargetBoard {
  company: string;
  type: "greenhouse" | "ashby" | "lever";
  slug: string;
  tier: "S" | "A" | "B" | "C";
  defaultSalary: string;
}

const TARGET_BOARDS: TargetBoard[] = [
  // S-Tier MNCs
  { company: "OpenAI", type: "ashby", slug: "openai", tier: "S", defaultSalary: "$260,000 – $380,000" },
  { company: "Stripe", type: "greenhouse", slug: "stripe", tier: "S", defaultSalary: "$240,000 – $330,000" },
  { company: "Databricks", type: "greenhouse", slug: "databricks", tier: "S", defaultSalary: "$250,000 – $340,000" },
  { company: "Palantir", type: "lever", slug: "palantir", tier: "S", defaultSalary: "$230,000 – $310,000" },
  { company: "GitHub", type: "greenhouse", slug: "github", tier: "S", defaultSalary: "$220,000 – $300,000" },
  { company: "Discord", type: "greenhouse", slug: "discord", tier: "S", defaultSalary: "$210,000 – $290,000" },

  // A-Tier Major Tech
  { company: "Figma", type: "greenhouse", slug: "figma", tier: "A", defaultSalary: "$220,000 – $290,000" },
  { company: "Cloudflare", type: "greenhouse", slug: "cloudflare", tier: "A", defaultSalary: "$200,000 – $270,000" },
  { company: "Airbnb", type: "greenhouse", slug: "airbnb", tier: "A", defaultSalary: "$215,000 – $285,000" },
  { company: "Ramp", type: "ashby", slug: "ramp", tier: "A", defaultSalary: "$210,000 – $275,000" },
  { company: "GitLab", type: "greenhouse", slug: "gitlab", tier: "A", defaultSalary: "$190,000 – $260,000" },
  { company: "MongoDB", type: "greenhouse", slug: "mongodb", tier: "A", defaultSalary: "$195,000 – $265,000" },
  { company: "Elastic", type: "greenhouse", slug: "elastic", tier: "A", defaultSalary: "$185,000 – $250,000" },

  // B-Tier High-Growth / Semi-MNC
  { company: "Supabase", type: "ashby", slug: "supabase", tier: "B", defaultSalary: "$170,000 – $230,000" },
  { company: "Linear", type: "ashby", slug: "linear", tier: "B", defaultSalary: "$180,000 – $240,000" },
  { company: "Sentry", type: "ashby", slug: "sentry", tier: "B", defaultSalary: "$175,000 – $235,000" },
  { company: "Spotify", type: "lever", slug: "spotify", tier: "B", defaultSalary: "$180,000 – $240,000" },
  { company: "Reddit", type: "greenhouse", slug: "reddit", tier: "B", defaultSalary: "$185,000 – $245,000" },

  // C-Tier Fast-Paced Startups
  { company: "Resend", type: "ashby", slug: "resend", tier: "C", defaultSalary: "$140,000 – $190,000" },
  { company: "Cal.com", type: "greenhouse", slug: "calcom", tier: "C", defaultSalary: "$130,000 – $180,000" },
  { company: "Raycast", type: "ashby", slug: "raycast", tier: "C", defaultSalary: "$145,000 – $195,000" },
];

const SKILL_KEYWORDS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "Go", "Golang",
  "Rust", "Java", "C++", "Kubernetes", "Docker", "AWS", "GCP", "Azure", "PostgreSQL",
  "Distributed Systems", "Kafka", "GraphQL", "REST", "Microservices", "CI/CD",
  "Machine Learning", "LLM", "PyTorch", "High Throughput", "Security", "Infra"
];

function extractTags(text: string, title: string): string[] {
  const combined = `${title} ${text}`.toLowerCase();
  const found = new Set<string>();

  for (const skill of SKILL_KEYWORDS) {
    if (combined.includes(skill.toLowerCase())) {
      found.add(skill === "Golang" ? "Go" : skill);
    }
  }

  if (found.size === 0) {
    found.add("Software Engineering");
    found.add("Full Stack");
    found.add("Backend");
  }

  return Array.from(found).slice(0, 6);
}

// In-memory cache to prevent spamming live ATS APIs
let cachedJobs: LiveJobItem[] = [];
let lastFetchedTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "JobPilot-LiveCrawler/2.0 (+https://jobpilot.ai/bot)",
        Accept: "application/json, text/plain, */*",
      },
      next: { revalidate: 300 },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBoard(board: TargetBoard): Promise<LiveJobItem[]> {
  try {
    if (board.type === "greenhouse") {
      const res = await fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data.jobs)) return [];

      return data.jobs.map((job: any) => ({
        externalId: `gh-${board.slug}-${job.id}`,
        title: job.title || "Software Engineer",
        company: board.company,
        url: job.absolute_url,
        location: job.location?.name || "Global / Remote",
        description: `${job.title} at ${board.company}. Verified active opening on Greenhouse ATS.`,
        source: "greenhouse" as const,
        tier: board.tier,
        salaryRange: board.defaultSalary,
        tags: extractTags(job.title || "", job.title || ""),
      }));
    }

    if (board.type === "ashby") {
      const res = await fetchWithTimeout(`https://api.ashbyhq.com/posting-api/job-board/${board.slug}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data.jobs)) return [];

      return data.jobs.map((job: any) => ({
        externalId: `ash-${board.slug}-${job.id}`,
        title: job.title || "Software Engineer",
        company: board.company,
        url: job.jobUrl,
        location: job.location || (job.isRemote ? "Remote" : "Global / Remote"),
        description: (job.descriptionPlain || job.title || "").slice(0, 300),
        source: "ashby" as const,
        tier: board.tier,
        salaryRange: board.defaultSalary,
        tags: extractTags(job.descriptionPlain || "", job.title || ""),
      }));
    }

    if (board.type === "lever") {
      const res = await fetchWithTimeout(`https://api.lever.co/v0/postings/${board.slug}?mode=json`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((job: any) => ({
        externalId: `lev-${board.slug}-${job.id}`,
        title: job.text || "Software Engineer",
        company: board.company,
        url: job.hostedUrl,
        location: job.categories?.location || "Remote",
        description: (job.descriptionPlain || job.text || "").slice(0, 300),
        source: "lever" as const,
        tier: board.tier,
        salaryRange: board.defaultSalary,
        tags: extractTags(job.descriptionPlain || "", job.text || ""),
      }));
    }
  } catch (err) {
    // If individual company fetch fails or times out, proceed gracefully
  }
  return [];
}

async function getLiveJobs(): Promise<LiveJobItem[]> {
  const now = Date.now();
  if (cachedJobs.length > 0 && now - lastFetchedTimestamp < CACHE_TTL_MS) {
    return cachedJobs;
  }

  const results = await Promise.allSettled(TARGET_BOARDS.map((b) => fetchBoard(b)));
  const allFetched: LiveJobItem[] = [];

  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      allFetched.push(...res.value);
    }
  }

  if (allFetched.length > 0) {
    cachedJobs = allFetched;
    lastFetchedTimestamp = now;
  }

  return cachedJobs;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") || "").toLowerCase().trim();
  const location = (searchParams.get("location") || "").toLowerCase().trim();
  const tier = searchParams.get("tier");
  const forceRefresh = searchParams.get("refresh") === "true";

  if (forceRefresh) {
    lastFetchedTimestamp = 0;
  }

  const allJobs = await getLiveJobs();
  let results = allJobs;

  if (keyword) {
    results = results.filter(
      (job) =>
        job.title.toLowerCase().includes(keyword) ||
        job.company.toLowerCase().includes(keyword) ||
        job.description.toLowerCase().includes(keyword) ||
        job.tags.some((t) => t.toLowerCase().includes(keyword))
    );
  }

  if (location && location !== "all") {
    results = results.filter((job) =>
      job.location.toLowerCase().includes(location)
    );
  }

  if (tier && tier !== "ALL") {
    results = results.filter((job) => job.tier === tier);
  }

  // Tier ranking priority: S -> A -> B -> C
  const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
  results = [...results].sort(
    (a, b) => (tierOrder[a.tier || "C"] ?? 3) - (tierOrder[b.tier || "C"] ?? 3)
  );

  const formattedResults = results.slice(0, 100).map((job) => {
    const chance = calculateSelectionChance(
      {
        jobTitle: job.title,
        descriptionSnippet: job.description,
        tags: job.tags,
        location: job.location,
        companyTier: job.tier,
      },
      INITIAL_CANDIDATE_PROFILE
    );
    return {
      ...job,
      matchScore: chance.overallPercentage,
      selectionChance: chance,
      verifiedLive: true,
    };
  });

  return NextResponse.json({
    success: true,
    data: formattedResults,
    meta: {
      fetchedAt: new Date().toISOString(),
      totalVerified: allJobs.length,
      returnedCount: formattedResults.length,
      isLiveAts: true,
      tiers: {
        S: formattedResults.filter((r) => r.tier === "S").length,
        A: formattedResults.filter((r) => r.tier === "A").length,
        B: formattedResults.filter((r) => r.tier === "B").length,
        C: formattedResults.filter((r) => r.tier === "C").length,
      },
    },
  });
}
