import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1/queue/worker-status`, {
      headers: getBackendHeaders(request),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Queue worker status is unavailable." }, { status: 502 });
  }
}
