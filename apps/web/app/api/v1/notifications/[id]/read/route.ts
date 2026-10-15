import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization") || "";

    const res = await fetch(`${BACKEND_API_URL}/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (res.status === 204 || res.ok) {
      return NextResponse.json({ success: true, message: "Notification marked read" });
    }

    return NextResponse.json({ success: false, message: "Failed to mark notification read" }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to mark notification read" },
      { status: 502 }
    );
  }
}
