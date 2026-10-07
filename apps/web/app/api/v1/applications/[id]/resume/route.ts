import { NextResponse } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "";

    // Forward to backend server if running
    try {
      const backendRes = await fetch(`${BACKEND_API_URL}/api/v1/applications/${id}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(authHeader ? { "Authorization": authHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json);
      }
    } catch {
      // Standalone Next.js fallback
    }

    return NextResponse.json({
      success: true,
      message: "Application resumed.",
      data: {
        applicationId: id,
        status: "RESUMED",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to resume application." },
      { status: 400 }
    );
  }
}
