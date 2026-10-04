import { NextResponse } from "next/server";
import { INITIAL_RESUMES, ResumeVersion } from "@/lib/mock-data";

let memoryResumes: ResumeVersion[] = [...INITIAL_RESUMES];

const ALL_KNOWN_SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Go", "Golang", "Rust",
  "Python", "Java", "C++", "C#", "Kubernetes", "Docker", "AWS", "GCP", "Azure",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "RabbitMQ", "GraphQL", "gRPC",
  "REST", "Microservices", "Distributed Systems", "System Design", "CI/CD", "Terraform",
  "Linux", "eBPF", "Prometheus", "Grafana", "Elasticsearch", "TailwindCSS", "Next.js"
];

function extractInfoFromText(text: string, fileName: string) {
  const clean = text.replace(/\r\n/g, "\n");
  
  // 1. Email
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  // 2. Phone
  const phoneMatch = clean.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  // 3. GitHub & LinkedIn
  const githubMatch = clean.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : "";

  const linkedinMatch = clean.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : "";

  // 4. Skills extraction
  const foundSkills = new Set<string>();
  const lowerText = clean.toLowerCase();

  for (const skill of ALL_KNOWN_SKILLS) {
    const pattern = new RegExp(`\\b${skill.toLowerCase()}\\b`, "i");
    if (pattern.test(lowerText)) {
      foundSkills.add(skill === "Golang" ? "Go" : skill);
    }
  }

  const skills = Array.from(foundSkills);
  if (skills.length === 0) {
    skills.push("Distributed Systems", "TypeScript", "Go", "PostgreSQL", "Kubernetes");
  }

  // 5. Role title inference
  let roleFocus = "Senior Software Engineer / Backend";
  if (/staff/i.test(clean) || /lead/i.test(clean) || /architect/i.test(clean)) {
    roleFocus = "Staff Software Engineer / Distributed Systems";
  } else if (/frontend|react|ui/i.test(clean)) {
    roleFocus = "Senior Frontend Engineer / Full Stack";
  } else if (/machine learning|ml|ai|llm/i.test(clean)) {
    roleFocus = "Staff AI / ML Systems Engineer";
  }

  // 6. Name extraction (first non-empty line)
  const lines = clean.split("\n").map(l => l.trim()).filter(l => l.length > 2 && !l.includes("@") && !l.includes("http"));
  const fullName = lines[0] ? lines[0].slice(0, 40) : "Candidate Profile";

  return {
    fullName,
    email,
    phone,
    github,
    linkedin,
    skills,
    roleFocus,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: memoryResumes,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") || formData.get("file");

    let textContent = "";
    let fileName = "Resume.pdf";
    let fileSize = "140 KB";

    if (file && typeof file === "object" && "name" in file) {
      const f = file as File;
      fileName = f.name;
      fileSize = `${Math.max(1, Math.round(f.size / 1024))} KB`;

      try {
        const arrayBuffer = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Extract raw readable ASCII/UTF-8 strings from binary/text buffer
        textContent = buffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      } catch {
        textContent = fileName;
      }
    }

    const parsed = extractInfoFromText(textContent, fileName);

    const newResume: ResumeVersion = {
      id: `resume-${Date.now()}`,
      name: fileName,
      roleFocus: parsed.roleFocus,
      updatedAt: "Just now",
      fileSize: fileSize,
      isDefault: memoryResumes.length === 0,
      topSkills: parsed.skills,
      matchRateAverage: 96,
    };

    memoryResumes = [newResume, ...memoryResumes];

    return NextResponse.json({
      success: true,
      data: {
        resume: newResume,
        profileUpdates: {
          fullName: parsed.fullName,
          title: parsed.roleFocus,
          email: parsed.email || undefined,
          phone: parsed.phone || undefined,
          github: parsed.github || undefined,
          linkedIn: parsed.linkedin || undefined,
          skills: parsed.skills,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to upload and parse resume." },
      { status: 400 }
    );
  }
}
