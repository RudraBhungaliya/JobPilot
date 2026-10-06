import { NextResponse } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = `${BACKEND_API_URL}/api/v1/jobs/live?${searchParams.toString()}`;

  try {
    const authHeader = request.headers.get("authorization") || "";
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...(authHeader ? { "Authorization": authHeader } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, count: 0, data: [], message: `Backend error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, count: 0, data: [], message: error.message || "Failed to reach backend" },
      { status: 502 }
    );
  }
}
