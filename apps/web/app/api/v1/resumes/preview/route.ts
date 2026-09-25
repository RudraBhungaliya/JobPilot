import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    const fileName = file ? file.name : "Resume_Upload.pdf";
    const fileSize = file ? `${Math.round(file.size / 1024)} KB` : "145 KB";

    // Simulate AI parsing and ATS vector analysis
    return NextResponse.json({
      success: true,
      data: {
        id: `res-${Date.now()}`,
        name: fileName,
        roleFocus: "Staff Software Engineer / Distributed Backend",
        updatedAt: "Just now",
        fileSize: fileSize,
        isDefault: false,
        topSkills: [
          "Distributed Systems",
          "Kubernetes",
          "Go",
          "Kafka",
          "PostgreSQL",
          "TypeScript",
          "AWS Core",
          "System Design",
          "Docker",
        ],
        matchRateAverage: 94,
        extractedSummary:
          "Experienced Distributed Systems Engineer with 8+ years architecting high-throughput backend services, payment switches, and multi-region Kubernetes clusters.",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to parse resume preview" },
      { status: 400 }
    );
  }
}
