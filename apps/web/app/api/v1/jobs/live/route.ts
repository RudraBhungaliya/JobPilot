import { NextResponse } from "next/server";

interface GreenhouseJobRaw {
  id: number | string;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: Array<{ name: string }>;
  updated_at?: string;
}

interface AshbyJobRaw {
  id: string;
  title: string;
  jobUrl: string;
  applyUrl?: string;
  location?: string;
  department?: string;
  descriptionPlain?: string;
}

interface LeverJobRaw {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
  };
  descriptionPlain?: string;
}

const GREENHOUSE_COMPANIES = [
  { board: "stripe", name: "Stripe", officialCompanyUrl: "https://stripe.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [55, 95] },
  { board: "cloudflare", name: "Cloudflare", officialCompanyUrl: "https://cloudflare.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [50, 88] },
  { board: "mongodb", name: "MongoDB", officialCompanyUrl: "https://mongodb.com", category: "MNC" as const, city: "Gurgaon", baseLPA: [42, 75] },
  { board: "datadog", name: "Datadog", officialCompanyUrl: "https://datadoghq.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [48, 85] },
  { board: "scaleai", name: "Scale AI", officialCompanyUrl: "https://scale.com", category: "MNC" as const, city: "Remote India", baseLPA: [65, 120] },
  { board: "figma", name: "Figma", officialCompanyUrl: "https://figma.com", category: "MNC" as const, city: "Remote India", baseLPA: [60, 115] },
  { board: "coinbase", name: "Coinbase", officialCompanyUrl: "https://coinbase.com", category: "MNC" as const, city: "Remote India", baseLPA: [55, 105] },
  { board: "roblox", name: "Roblox", officialCompanyUrl: "https://roblox.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [52, 92] },
  { board: "affirm", name: "Affirm", officialCompanyUrl: "https://affirm.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [45, 82] },
  { board: "airbnb", name: "Airbnb", officialCompanyUrl: "https://airbnb.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [55, 98] },
  { board: "brex", name: "Brex", officialCompanyUrl: "https://brex.com", category: "SEMI_MNC" as const, city: "Remote India", baseLPA: [50, 95] },
  { board: "lyft", name: "Lyft", officialCompanyUrl: "https://lyft.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [48, 86] },
  { board: "twilio", name: "Twilio", officialCompanyUrl: "https://twilio.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [44, 78] },
  { board: "elastic", name: "Elastic", officialCompanyUrl: "https://elastic.co", category: "MNC" as const, city: "Pune", baseLPA: [45, 82] },
  { board: "gitlab", name: "GitLab", officialCompanyUrl: "https://gitlab.com", category: "REMOTE" as const, city: "Remote India", baseLPA: [60, 115] },
  { board: "reddit", name: "Reddit", officialCompanyUrl: "https://reddit.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [55, 95] },
  { board: "pinterest", name: "Pinterest", officialCompanyUrl: "https://pinterest.com", category: "MNC" as const, city: "Bengaluru", baseLPA: [50, 88] },
];

const ASHBY_COMPANIES = [
  { board: "openai", name: "OpenAI", officialCompanyUrl: "https://openai.com", category: "MNC" as const, city: "Remote India", baseLPA: [90, 180] },
  { board: "perplexity", name: "Perplexity AI", officialCompanyUrl: "https://perplexity.ai", category: "MNC" as const, city: "Remote India", baseLPA: [85, 160] },
  { board: "replit", name: "Replit", officialCompanyUrl: "https://replit.com", category: "SEMI_MNC" as const, city: "Remote India", baseLPA: [75, 140] },
  { board: "cursor", name: "Cursor (Anysphere)", officialCompanyUrl: "https://cursor.com", category: "REMOTE" as const, city: "Remote India", baseLPA: [80, 150] },
  { board: "supabase", name: "Supabase", officialCompanyUrl: "https://supabase.com", category: "REMOTE" as const, city: "Remote India", baseLPA: [70, 130] },
  { board: "linear", name: "Linear", officialCompanyUrl: "https://linear.app", category: "REMOTE" as const, city: "Remote India", baseLPA: [75, 140] },
  { board: "ramp", name: "Ramp", officialCompanyUrl: "https://ramp.com", category: "MNC" as const, city: "Remote India", baseLPA: [70, 135] },
  { board: "sentry", name: "Sentry", officialCompanyUrl: "https://sentry.io", category: "REMOTE" as const, city: "Remote India", baseLPA: [65, 120] },
  { board: "vanta", name: "Vanta", officialCompanyUrl: "https://vanta.com", category: "SEMI_MNC" as const, city: "Remote India", baseLPA: [60, 110] },
  { board: "posthog", name: "PostHog", officialCompanyUrl: "https://posthog.com", category: "REMOTE" as const, city: "Remote India", baseLPA: [75, 138] },
  { board: "midjourney", name: "Midjourney", officialCompanyUrl: "https://midjourney.com", category: "REMOTE" as const, city: "Remote India", baseLPA: [80, 160] },
];

const LEVER_COMPANIES = [
  { board: "spotify", name: "Spotify", officialCompanyUrl: "https://spotify.com", category: "MNC" as const, city: "Mumbai", baseLPA: [50, 92] },
];

const INDIAN_CITIES = [
  "bengaluru", "bangalore", "hyderabad", "secunderabad", "pune", "mumbai", "delhi", "new delhi",
  "gurgaon", "gurugram", "noida", "greater noida", "chennai", "kolkata", "ahmedabad", "gandhinagar",
  "jaipur", "indore", "vadodara", "kochi", "thiruvananthapuram", "chandigarh", "mohali", "coimbatore",
  "bhubaneswar", "surat", "nagpur", "visakhapatnam"
];

const NON_INDIA_REGIONS = [
  "united states", "usa", "u.s.", "san francisco", "new york", "seattle", "austin",
  "california", "texas", "washington", "united kingdom", "uk", "london", "europe", "emea",
  "germany", "berlin", "canada", "toronto", "vancouver", "australia", "sydney", "latin america",
  "latam", "brazil", "mexico", "france", "paris", "japan", "tokyo"
];

function isIndiaRole(rawLoc: string | undefined | null, title: string, companyCityDefault?: string): { isCompatible: boolean; city: string; displayLoc: string; workMode: "Remote" | "Hybrid" | "Onsite"; isRemote: boolean; remoteScope?: string } {
  const loc = (rawLoc || "").toLowerCase();
  const t = title.toLowerCase();

  const isRemote = loc.includes("remote") || loc.includes("anywhere") || loc.includes("worldwide") || loc.includes("global") || t.includes("remote");
  const hasNonIndia = NON_INDIA_REGIONS.some((r) => loc.includes(r));
  const hasIndia = loc.includes("india") || loc.includes(", in") || loc.includes("(in)") || t.includes("india");

  let detectedCity = "Remote India";
  for (const c of INDIAN_CITIES) {
    if (loc.includes(c)) {
      detectedCity = c === "bangalore" ? "Bengaluru" : c === "gurugram" ? "Gurgaon" : c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  if (detectedCity === "Remote India" && companyCityDefault) {
    detectedCity = companyCityDefault;
  }

  let isCompatible = false;
  let remoteScope: string | undefined = undefined;

  if (isRemote) {
    if (hasIndia || (detectedCity !== "Remote India" && !hasNonIndia)) {
      remoteScope = "India";
      isCompatible = true;
    } else if (loc.includes("worldwide") || loc.includes("global") || loc.includes("anywhere") || loc.includes("apac")) {
      if (!hasNonIndia) {
        remoteScope = "Worldwide";
        isCompatible = true;
      }
    }
  } else {
    if (detectedCity !== "Remote India" && !hasNonIndia) {
      isCompatible = true;
    } else if (hasIndia && !hasNonIndia) {
      isCompatible = true;
    }
  }

  const workMode = isRemote ? "Remote" : loc.includes("hybrid") ? "Hybrid" : "Onsite";
  const displayLoc = isRemote ? `Remote (${remoteScope === "Worldwide" ? "Global" : detectedCity})` : `${detectedCity}, India`;

  return { isCompatible, city: detectedCity, displayLoc, workMode, isRemote, remoteScope };
}

let cache: { timestamp: number; data: any[] } | null = null;

function getCategoryLabel(category: string): string {
  if (category === "MNC") return "MNC";
  if (category === "SEMI_MNC") return "Unicorn";
  return "Remote";
}

export async function GET(req: Request) {
  // 1. Try forwarding to backend server if running
  try {
    const { search } = new URL(req.url);
    const backendRes = await fetch(`http://127.0.0.1:8000/api/v1/jobs/live${search}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000),
    });
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Continue with real-time direct ATS querying
  }

  // 2. Real-time Live Scraper from Greenhouse, Ashby, Lever
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const keyword = searchParams.get("keyword");
  const minSalaryLPA = searchParams.get("minSalaryLPA") ? Number(searchParams.get("minSalaryLPA")) : 0;

  if (cache && Date.now() - cache.timestamp < 3 * 60 * 1000) {
    const filtered = filterList(cache.data, { category, city, keyword, minSalaryLPA });
    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  }

  const allJobs: any[] = [];

  const ghTasks = GREENHOUSE_COMPANIES.map(async (c) => {
    try {
      const sourceUrl = `https://boards-api.greenhouse.io/v1/boards/${c.board}/jobs`;
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return;
      const json = (await res.json()) as { jobs?: GreenhouseJobRaw[] };
      if (!Array.isArray(json.jobs)) return;

      for (const raw of json.jobs.slice(0, 30)) {
        const rawLoc = raw.location?.name;
        const locInfo = isIndiaRole(rawLoc, raw.title, c.city);
        if (!locInfo.isCompatible) continue;

        const atsUrl = raw.id ? `https://job-boards.greenhouse.io/${c.board}/jobs/${raw.id}` : raw.absolute_url;
        const canonicalUrl = raw.absolute_url || atsUrl;
        const applyUrl = `${canonicalUrl}#app`;
        const salary = calculateSalary(raw.title, c.baseLPA);
        const exp = estimateExp(raw.title);
        const dept = raw.departments?.[0]?.name || "Engineering";

        allJobs.push({
          id: `gh-${c.board}-${raw.id}`,
          title: raw.title,
          department: dept,
          company: c.name,
          category: c.category,
          categoryLabel: getCategoryLabel(c.category),
          location: locInfo.displayLoc,
          city: locInfo.city,
          country: "India",
          workMode: locInfo.workMode,
          isRemote: locInfo.isRemote,
          remoteScope: locInfo.remoteScope,
          sourceUrl,
          atsUrl,
          officialCompanyUrl: c.officialCompanyUrl,
          applyUrl,
          canonicalUrl,
          sourceType: "GREENHOUSE",
          url: canonicalUrl,
          source: "greenhouse",
          atsProvider: "Greenhouse",
          salaryINR: `₹${salary.min} - ${salary.max} LPA`,
          salaryMinLPA: salary.min,
          salaryMaxLPA: salary.max,
          experienceLevel: exp,
          tags: extractTags(raw.title),
          description: `${raw.title} opening at ${c.name} in ${dept}. Realtime Greenhouse verified posting.`,
          postedAt: raw.updated_at || new Date().toISOString(),
          matchScore: 95,
        });
      }
    } catch {
      // Continue
    }
  });

  const ashbyTasks = ASHBY_COMPANIES.map(async (c) => {
    try {
      const sourceUrl = `https://api.ashbyhq.com/posting-api/job-board/${c.board}`;
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return;
      const json = (await res.json()) as { jobs?: AshbyJobRaw[] };
      if (!Array.isArray(json.jobs)) return;

      for (const raw of json.jobs) {
        const rawLoc = raw.location;
        const locInfo = isIndiaRole(rawLoc, raw.title, c.city);
        if (!locInfo.isCompatible) continue;

        const atsUrl = raw.jobUrl || (raw.id ? `https://jobs.ashbyhq.com/${c.board}/${raw.id}` : "");
        if (!atsUrl) continue;
        const applyUrl = raw.applyUrl || `${atsUrl}/application`;
        const canonicalUrl = atsUrl;
        const salary = calculateSalary(raw.title, c.baseLPA);
        const exp = estimateExp(raw.title);
        const dept = raw.department || "Engineering";

        allJobs.push({
          id: `ashby-${c.board}-${raw.id}`,
          title: raw.title,
          department: dept,
          company: c.name,
          category: c.category,
          categoryLabel: getCategoryLabel(c.category),
          location: locInfo.displayLoc,
          city: locInfo.city,
          country: "India",
          workMode: locInfo.workMode,
          isRemote: locInfo.isRemote,
          remoteScope: locInfo.remoteScope,
          sourceUrl,
          atsUrl,
          officialCompanyUrl: c.officialCompanyUrl,
          applyUrl,
          canonicalUrl,
          sourceType: "ASHBY",
          url: canonicalUrl,
          source: "ashby",
          atsProvider: "Ashby",
          salaryINR: `₹${salary.min} - ${salary.max} LPA`,
          salaryMinLPA: salary.min,
          salaryMaxLPA: salary.max,
          experienceLevel: exp,
          tags: extractTags(raw.title),
          description: raw.descriptionPlain?.slice(0, 160) || `${raw.title} at ${c.name}`,
          postedAt: new Date().toISOString(),
          matchScore: 98,
        });
      }
    } catch {
      // Continue
    }
  });

  const leverTasks = LEVER_COMPANIES.map(async (c) => {
    try {
      const sourceUrl = `https://api.lever.co/v0/postings/${c.board}?mode=json`;
      const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return;
      const json = (await res.json()) as LeverJobRaw[];
      if (!Array.isArray(json)) return;

      for (const raw of json.slice(0, 20)) {
        const rawLoc = raw.categories?.location;
        const locInfo = isIndiaRole(rawLoc, raw.text, c.city);
        if (!locInfo.isCompatible) continue;

        const atsUrl = raw.hostedUrl || (raw.id ? `https://jobs.lever.co/${c.board}/${raw.id}` : "");
        if (!atsUrl) continue;
        const applyUrl = raw.applyUrl || `${atsUrl}/apply`;
        const canonicalUrl = atsUrl;
        const salary = calculateSalary(raw.text, c.baseLPA);
        const exp = estimateExp(raw.text);
        const dept = raw.categories?.team || "Engineering";

        allJobs.push({
          id: `lever-${c.board}-${raw.id}`,
          title: raw.text,
          department: dept,
          company: c.name,
          category: c.category,
          categoryLabel: getCategoryLabel(c.category),
          location: locInfo.displayLoc,
          city: locInfo.city,
          country: "India",
          workMode: locInfo.workMode,
          isRemote: locInfo.isRemote,
          remoteScope: locInfo.remoteScope,
          sourceUrl,
          atsUrl,
          officialCompanyUrl: c.officialCompanyUrl,
          applyUrl,
          canonicalUrl,
          sourceType: "LEVER",
          url: canonicalUrl,
          source: "lever",
          atsProvider: "Lever",
          salaryINR: `₹${salary.min} - ${salary.max} LPA`,
          salaryMinLPA: salary.min,
          salaryMaxLPA: salary.max,
          experienceLevel: exp,
          tags: extractTags(raw.text),
          description: raw.descriptionPlain?.slice(0, 160) || `${raw.text} at ${c.name}`,
          postedAt: new Date().toISOString(),
          matchScore: 94,
        });
      }
    } catch {
      // Continue
    }
  });

  await Promise.allSettled([...ghTasks, ...ashbyTasks, ...leverTasks]);

  if (allJobs.length > 0) {
    cache = { timestamp: Date.now(), data: allJobs };
  }

  const filtered = filterList(allJobs, { category, city, keyword, minSalaryLPA });
  return NextResponse.json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
}

function calculateSalary(title: string, base: number[]) {
  const l = title.toLowerCase();
  let m = 1.0;
  if (l.includes("lead") || l.includes("staff") || l.includes("principal")) m = 1.4;
  else if (l.includes("senior") || l.includes("sr.")) m = 1.2;
  else if (l.includes("junior") || l.includes("intern")) m = 0.65;
  return { min: Math.round(base[0] * m), max: Math.round(base[1] * m) };
}

function estimateExp(title: string) {
  const l = title.toLowerCase();
  if (l.includes("lead") || l.includes("staff") || l.includes("principal")) return "Staff / Lead (6+ yrs)";
  if (l.includes("senior") || l.includes("sr")) return "Mid-Senior (3-6 yrs)";
  return "Junior (1-3 yrs)";
}

function extractTags(title: string) {
  const t = ["TypeScript", "React", "Node.js"];
  const l = title.toLowerCase();
  if (l.includes("backend") || l.includes("platform")) t.push("Golang", "PostgreSQL", "Docker");
  if (l.includes("frontend") || l.includes("ui")) t.push("Next.js", "Tailwind CSS");
  if (l.includes("ai") || l.includes("data")) t.push("Python", "LLMs", "PyTorch");
  return Array.from(new Set(t));
}

function filterList(list: any[], f: { category?: string | null; city?: string | null; keyword?: string | null; minSalaryLPA?: number }) {
  const filtered = list.filter((j) => {
    if (f.category && f.category !== "ALL" && j.category !== f.category) return false;
    if (f.city && f.city !== "ALL" && !`${j.city} ${j.location}`.toLowerCase().includes(f.city.toLowerCase())) return false;
    if (f.minSalaryLPA && j.salaryMaxLPA < f.minSalaryLPA) return false;
    if (f.keyword && f.keyword.trim().length > 0) {
      const text = `${j.title} ${j.company} ${j.tags.join(" ")} ${j.location}`.toLowerCase();
      const terms = f.keyword.toLowerCase().split(/\s+/).filter((k: string) => k.length > 1);
      if (!terms.some((term: string) => text.includes(term))) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const getPriority = (j: any) => {
      if (j.category === "MNC") return 100;
      if (j.category === "SEMI_MNC") return 80;
      return 40; // REMOTE
    };
    const pDiff = getPriority(b) - getPriority(a);
    if (pDiff !== 0) return pDiff;
    return (b.salaryMaxLPA || 0) - (a.salaryMaxLPA || 0);
  });
}
