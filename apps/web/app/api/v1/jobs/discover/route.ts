import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1/jobs/discover${search}`, {
      headers: getBackendHeaders(request),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Live job sources are unavailable." }, { status: 502 });
  }
}
