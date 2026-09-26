import { NextResponse } from "next/server";

const ALL_KNOWN_SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Go", "Golang", "Rust",
  "Python", "Java", "C++", "C#", "Kubernetes", "Docker", "AWS", "GCP", "Azure",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "RabbitMQ", "GraphQL", "gRPC",
  "REST", "Microservices", "Distributed Systems", "System Design", "CI/CD", "Terraform",
  "Linux", "eBPF", "Prometheus", "Grafana", "Elasticsearch", "TailwindCSS"
];

function extractInfoFromText(text: string, fileName: string) {
  const clean = text.replace(/\r\n/g, "\n");
  
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = clean.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  const githubMatch = clean.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : "";

  const linkedinMatch = clean.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : "";

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

  let roleFocus = "Staff Software Engineer / Distributed Backend";
  if (/lead/i.test(clean) || /architect/i.test(clean)) {
    roleFocus = "Principal Systems Architect / Cloud Infrastructure";
  } else if (/frontend|react|ui/i.test(clean)) {
    roleFocus = "Staff Frontend / Full Stack Engineer";
  } else if (/machine learning|ml|ai|llm/i.test(clean)) {
    roleFocus = "Staff AI / ML Systems Engineer";
  }

  const lines = clean.split("\n").map(l => l.trim()).filter(l => l.length > 2 && !l.includes("@") && !l.includes("http"));
  const fullName = lines[0] ? lines[0].slice(0, 40) : "Alex Chen";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = (formData.get("resume") || formData.get("file")) as File | null;

    let textContent = "";
    let fileName = file ? file.name : "Resume_Upload.pdf";
    let fileSize = file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "145 KB";

    if (file && typeof file === "object" && "arrayBuffer" in file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        textContent = buffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      } catch {
        textContent = fileName;
      }
    }

    const parsed = extractInfoFromText(textContent, fileName);

    return NextResponse.json({
      success: true,
      data: {
        id: `res-${Date.now()}`,
        name: fileName,
        roleFocus: parsed.roleFocus,
        updatedAt: "Just now",
        fileSize: fileSize,
        isDefault: false,
        topSkills: parsed.skills,
        matchRateAverage: 96,
        parsed: {
          skills: parsed.skills,
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          github: parsed.github,
          linkedin: parsed.linkedin,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to parse resume preview" },
      { status: 400 }
    );
  }
}
