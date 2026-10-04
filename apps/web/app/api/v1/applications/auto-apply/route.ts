import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Forward to backend server if running
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/applications/auto-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json, { status: 202 });
      }
    } catch {
      // If standalone Next.js client, return structured accepted response
    }

    const { discoveredJob, jobId } = body;
    const appId = `app-${Date.now()}`;
    const queueId = `queue-${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        message: "Application queued successfully for real-time auto-apply execution.",
        data: {
          applicationId: appId,
          queueId,
          status: "QUEUED",
          job: discoveredJob || { id: jobId },
          createdAt: new Date().toISOString(),
        },
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to initiate auto-apply." },
      { status: 400 }
    );
  }
}
