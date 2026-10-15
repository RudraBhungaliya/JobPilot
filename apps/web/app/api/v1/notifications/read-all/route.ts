import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const res = await fetch(`${BACKEND_API_URL}/api/v1/notifications/read-all`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (res.status === 204 || res.ok) {
      return NextResponse.json({ success: true, message: "All notifications marked read" });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to mark notifications read" },
      { status: 502 }
    );
  }
}
