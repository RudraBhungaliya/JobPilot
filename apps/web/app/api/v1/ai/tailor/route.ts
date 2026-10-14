import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/ai/tailor`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to tailor resume." },
      { status: 502 }
    );
  }
}
