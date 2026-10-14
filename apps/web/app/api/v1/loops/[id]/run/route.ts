import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops/${id}/run`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to execute loop run on backend." },
      { status: 502 }
    );
  }
}
