import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${getBackendApiUrl()}/api/v1/resumes/parse-text`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, message: text || "Invalid response from server" };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Resume parsing service is unavailable." }, { status: 502 });
  }
}
