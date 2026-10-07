import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_API_URL}/api/v1/applications/pipeline/stats${searchParams ? `?${searchParams}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Backend error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch pipeline stats" },
      { status: 502 }
    );
  }
}
