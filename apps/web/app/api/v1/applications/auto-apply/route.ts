import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(request: Request) {
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1/applications/auto-apply`, {
      method: "POST",
      headers: getBackendHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Application queue is unavailable." }, { status: 502 });
  }
}
