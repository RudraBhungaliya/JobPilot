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

const DISCOVERY_DATABASE: LiveJobItem[] = [
  // S-Tier MNCs (Top Priority)
  {
    externalId: "gh-goog-01",
    title: "Senior Staff Software Engineer - Cloud AI & Distributed Storage",
    company: "Google",
    url: "https://boards.greenhouse.io/google/jobs/5829104",
    location: "Bengaluru, India / Mountain View, CA",
    description: "Build next-generation distributed storage and cluster management systems powering Gemini and Vertex AI large scale inference pipelines.",
    source: "greenhouse",
    tier: "S",
    salaryRange: "$260,000 – $340,000",
    tags: ["Distributed Systems", "Kubernetes", "Go", "Borg", "Large Scale Inference", "PostgreSQL"],
  },
  {
    externalId: "gh-strp-01",
    title: "Staff Infrastructure Engineer - Global Payments Core",
    company: "Stripe",
    url: "https://boards.greenhouse.io/stripe/jobs/4910283",
    location: "Remote (Global) / San Francisco, CA",
    description: "Design high-reliability distributed ledger architectures processing hundreds of billions in financial volume with five-nines uptime.",
    source: "greenhouse",
    tier: "S",
    salaryRange: "$240,000 – $310,000",
    tags: ["Distributed Systems", "Go", "Kafka", "PostgreSQL", "Idempotency", "System Design"],
  },
  {
    externalId: "ash-msft-01",
    title: "Principal Distributed Systems Architect - Azure Core",
    company: "Microsoft",
    url: "https://jobs.ashbyhq.com/microsoft/d91a-4712",
    location: "Bengaluru, India / Redmond, WA",
    description: "Architect high-throughput, low-latency microservices and edge compute fabrics running hyper-scale enterprise infrastructure.",
    source: "ashby",
    tier: "S",
    salaryRange: "$230,000 – $295,000",
    tags: ["Distributed Systems", "Azure", "Go", "Kubernetes", "High Availability", "Kafka"],
  },
  {
    externalId: "gh-nvda-01",
    title: "Senior CUDA Systems Engineer - TensorRT & Accelerated Computing",
    company: "NVIDIA",
    url: "https://boards.greenhouse.io/nvidia/jobs/7102941",
    location: "Bengaluru, India / Santa Clara, CA",
    description: "Develop ultra-low latency inference engines and deep memory hierarchy optimizations for Blackwell architectures.",
    source: "greenhouse",
    tier: "S",
    salaryRange: "$220,000 – $290,000",
    tags: ["CUDA", "C++", "TensorRT", "GPU Architecture", "Deep Learning Compilers", "Distributed Systems"],
  },
  {
    externalId: "ash-open-01",
    title: "Research Systems Engineer - Inference & Training Infrastructure",
    company: "OpenAI",
    url: "https://jobs.ashbyhq.com/openai/9182-4112",
    location: "San Francisco, CA / Remote",
    description: "Frontier systems engineer specializing in low-overhead collective communications and petabyte-scale training checkpointing.",
    source: "ashby",
    tier: "S",
    salaryRange: "$270,000 – $360,000",
    tags: ["Distributed Systems", "PyTorch", "CUDA", "C++", "High Concurrency", "Python"],
  },
  {
    externalId: "gh-meta-01",
    title: "Production Engineer - AI Systems & PyTorch Core",
    company: "Meta",
    url: "https://boards.greenhouse.io/meta/jobs/6192834",
    location: "Menlo Park, CA / London, UK / Hybrid",
    description: "Optimize large model GPU clusters, network fabrics, and kernel performance across thousands of H100 GPU nodes.",
    source: "greenhouse",
    tier: "S",
    salaryRange: "$250,000 – $320,000",
    tags: ["Distributed Systems", "Python", "C++", "PyTorch", "Kernel Optimization", "Linux"],
  },

  // A-Tier MNCs (Second Priority)
  {
    externalId: "gh-spot-01",
    title: "Staff Backend Engineer - Audio Streaming & Discovery Engine",
    company: "Spotify",
    url: "https://boards.greenhouse.io/spotify/jobs/5201948",
    location: "Stockholm, Sweden / New York / Remote",
    description: "Scale high-performance event-driven streaming pipelines serving 600M+ active listeners with sub-100ms recommendation latency.",
    source: "greenhouse",
    tier: "A",
    salaryRange: "$210,000 – $270,000",
    tags: ["Distributed Systems", "Go", "Kafka", "Microservices", "gRPC", "Low Latency"],
  },
  {
    externalId: "lev-atls-01",
    title: "Senior Full Stack Engineer - Jira Enterprise Cloud",
    company: "Atlassian",
    url: "https://jobs.lever.co/atlassian/8210394",
    location: "Bengaluru, India / Sydney, Australia / Remote",
    description: "Develop resilient real-time collaboration engines and canvas components powering 300,000+ enterprise teams worldwide.",
    source: "lever",
    tier: "A",
    salaryRange: "$190,000 – $250,000",
    tags: ["React", "TypeScript", "Next.js", "GraphQL", "Microservices", "Docker"],
  },
  {
    externalId: "gh-cflr-01",
    title: "Senior Edge Infrastructure Engineer - Workers KV & R2",
    company: "Cloudflare",
    url: "https://boards.greenhouse.io/cloudflare/jobs/4820192",
    location: "Austin, TX / London / Remote",
    description: "Scale globally distributed key-value stores and edge caching across 300+ PoPs worldwide with Rust and eBPF.",
    source: "greenhouse",
    tier: "A",
    salaryRange: "$200,000 – $260,000",
    tags: ["Rust", "eBPF", "Distributed Systems", "DNS / BGP", "Distributed Caching"],
  },
  {
    externalId: "ash-figm-01",
    title: "Systems Engineer - WebGL & Multiplayer Canvas Engine",
    company: "Figma",
    url: "https://jobs.ashbyhq.com/figma/6102-1823",
    location: "San Francisco, CA / New York / Hybrid",
    description: "Design real-time CRDT synchronization protocols and GPU-accelerated rendering pipelines in C++ and WebAssembly.",
    source: "ashby",
    tier: "A",
    salaryRange: "$220,000 – $280,000",
    tags: ["TypeScript", "C++", "Rust", "WebAssembly", "CRDT Sync", "WebGL"],
  },
  {
    externalId: "lev-coin-01",
    title: "Senior Blockchain Platform Engineer - Layer 2 & Base Infrastructure",
    company: "Coinbase",
    url: "https://jobs.lever.co/coinbase/3910284",
    location: "Remote (US/India/EMEA)",
    description: "Build robust node clustering, rollups validation, and low-latency transaction routing fabrics for cryptographic settlement.",
    source: "lever",
    tier: "A",
    salaryRange: "$215,000 – $275,000",
    tags: ["Go", "Distributed Systems", "Cryptography", "Kubernetes", "PostgreSQL"],
  },

  // B-Tier Semi-MNCs (Third Priority)
  {
    externalId: "gh-rzrp-01",
    title: "Lead Platform Engineer - Banking Core & UPI Switch",
    company: "Razorpay",
    url: "https://boards.greenhouse.io/razorpay/jobs/8201923",
    location: "Bengaluru, Karnataka, India",
    description: "Engineer high-frequency payment switches handling 10,000+ TPS with zero-downtime ledger consistency.",
    source: "greenhouse",
    tier: "B",
    salaryRange: "₹45,00,000 – ₹70,00,000",
    tags: ["Go", "Distributed Systems", "Kafka", "PostgreSQL", "UPI Architecture", "High TPS"],
  },
  {
    externalId: "gh-post-01",
    title: "Staff Software Engineer - API Runtime & Mocking Engine",
    company: "Postman",
    url: "https://boards.greenhouse.io/postman/jobs/3820192",
    location: "Bengaluru, India / San Francisco / Remote",
    description: "Scale the developer tool runtime used by 30+ million developers worldwide to design, test, and mock distributed APIs.",
    source: "greenhouse",
    tier: "B",
    salaryRange: "$180,000 – $230,000",
    tags: ["TypeScript", "Node.js", "Distributed Systems", "gRPC", "V8 Engine"],
  },
  {
    externalId: "ash-supa-01",
    title: "Senior Database Engineer - Postgres Realtime & Edge Functions",
    company: "Supabase",
    url: "https://jobs.ashbyhq.com/supabase/8192-3112",
    location: "Remote (Global)",
    description: "Extend open-source PostgreSQL with replication daemons, tenant isolation, and WebAssembly runtime integration.",
    source: "ashby",
    tier: "B",
    salaryRange: "$170,000 – $220,000",
    tags: ["PostgreSQL", "Elixir", "Rust", "TypeScript", "Realtime WebSocket", "Docker"],
  },
  {
    externalId: "gh-vrc-01",
    title: "Staff Edge Runtime Engineer - Next.js & Turbopack",
    company: "Vercel",
    url: "https://boards.greenhouse.io/vercel/jobs/5920192",
    location: "Remote (Global)",
    description: "Improve compilation speeds, bundler heuristics, and serverless compute primitives for modern web frameworks.",
    source: "greenhouse",
    tier: "B",
    salaryRange: "$190,000 – $250,000",
    tags: ["Rust", "Next.js", "TypeScript", "V8 Isolates", "Edge Runtime"],
  },
  {
    externalId: "lev-lin-01",
    title: "Product Engineer - Realtime Collaboration & Offline Sync",
    company: "Linear",
    url: "https://jobs.lever.co/linear/4920183",
    location: "Remote (US/EU/Global)",
    description: "Craft ultra-responsive, keyboard-first issue tracking software with instant optimistic updates and SQLite sync.",
    source: "lever",
    tier: "B",
    salaryRange: "$180,000 – $240,000",
    tags: ["TypeScript", "React", "SQLite", "CRDT", "WebSockets"],
  },

  // C-Tier Remote Startups (Fourth Priority)
  {
    externalId: "ash-rsnd-01",
    title: "Full Stack Engineer - Email Infrastructure & SDKs",
    company: "Resend",
    url: "https://jobs.ashbyhq.com/resend/1029-4829",
    location: "Remote (Global)",
    description: "Build clean, developer-friendly transactional email APIs and React email components for modern applications.",
    source: "ashby",
    tier: "C",
    salaryRange: "$140,000 – $180,000",
    tags: ["React", "Next.js", "TypeScript", "SMTP / DNS", "Serverless Edge"],
  },
  {
    externalId: "gh-calc-01",
    title: "Senior Frontend Engineer - Open Source Scheduling",
    company: "Cal.com",
    url: "https://boards.greenhouse.io/calcom/jobs/2910283",
    location: "Remote (Global)",
    description: "Create seamless calendar booking workflows, timezone algorithms, and video integration extensions.",
    source: "greenhouse",
    tier: "C",
    salaryRange: "$130,000 – $170,000",
    tags: ["TypeScript", "Next.js", "React", "Prisma", "TailwindCSS"],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") || "").toLowerCase().trim();
  const location = (searchParams.get("location") || "").toLowerCase().trim();
  const tier = searchParams.get("tier");

  let results = DISCOVERY_DATABASE;

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

  const formattedResults = results.map((job) => {
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
    };
  });

  return NextResponse.json({
    data: formattedResults,
    meta: {
      fetchedAt: new Date().toISOString(),
      total: formattedResults.length,
      tiers: {
        S: formattedResults.filter((r) => r.tier === "S").length,
        A: formattedResults.filter((r) => r.tier === "A").length,
        B: formattedResults.filter((r) => r.tier === "B").length,
        C: formattedResults.filter((r) => r.tier === "C").length,
      },
    },
  });
}
