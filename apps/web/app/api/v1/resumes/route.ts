import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${getBackendApiUrl()}/api/v1/resumes`, {
      headers: getBackendHeaders(request),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Resume service is unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const response = await fetch(`${getBackendApiUrl()}/api/v1/resumes`, {
      method: "POST",
      headers: getBackendHeaders(request),
      body: form,
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ success: false, message: "Resume upload service is unavailable." }, { status: 502 });
  }
}
