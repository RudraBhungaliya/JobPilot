import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Try forwarding to backend server
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/applications", {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json);
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
