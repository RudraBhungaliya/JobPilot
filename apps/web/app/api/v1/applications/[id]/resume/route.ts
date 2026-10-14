import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const backendUrl = getBackendApiUrl();

    const backendRes = await fetch(`${backendUrl}/api/v1/applications/${id}/resume`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = await backendRes.json();
    return NextResponse.json(json, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Application service is unavailable." },
      { status: 502 }
    );
  }
}
