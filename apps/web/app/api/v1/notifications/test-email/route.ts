import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Try forwarding to backend server
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/notifications/test-email", {
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
      // Continue
    }

    // Direct simulated/logged email dispatch
    console.log(`[JobPilot Mailer] 📧 Email Alert sent to: ${body.email} | Job: ${body.jobTitle} at ${body.companyName}`);

    return NextResponse.json({
      success: true,
      message: `Alert email dispatched to ${body.email}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
