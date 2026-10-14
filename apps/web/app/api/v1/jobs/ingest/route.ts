import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${getBackendApiUrl()}/api/v1/jobs/ingest`, {
      method: "POST",
      headers: getBackendHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Job ingestion service is unavailable." }, { status: 502 });
  }
}
