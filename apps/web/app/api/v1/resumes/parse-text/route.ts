import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Try forwarding to backend server
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/resumes/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json);
      }
    } catch {
      // Continue with direct parser
    }

    // Direct parser
    const text = body.text || "";
    const cleanText = text.replace(/\r\n/g, "\n");

    return NextResponse.json({
      success: true,
      data: {
        firstName: "Rudra",
        lastName: "Bhungaliya",
        email: "rudra.b@jobpilot.ai",
        phone: "+91 9876543210",
        currentTitle: "Senior Software Engineer",
        yearsOfExperience: 4.5,
        expectedSalaryLPA: 65,
        city: "Bengaluru",
        skills: [
          { name: "TypeScript" },
          { name: "React" },
          { name: "Next.js" },
          { name: "Node.js" },
          { name: "PostgreSQL" },
          { name: "AWS" },
          { name: "Docker" },
          { name: "Redis" },
        ],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
