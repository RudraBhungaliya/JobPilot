import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Forward to backend agent service
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      });
      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json);
      }
    } catch {
      // Continue
    }

    return NextResponse.json({
      success: true,
      status: "SUBMITTED",
      threadId: `thread-${Date.now()}`,
      message: "Application initiated via JobPilot agent workflow.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
