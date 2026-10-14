import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function GET(req: NextRequest) {
  try {
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops`, {
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to connect to loop service backend." },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to create job search loop on backend." },
      { status: 502 }
    );
  }
}
