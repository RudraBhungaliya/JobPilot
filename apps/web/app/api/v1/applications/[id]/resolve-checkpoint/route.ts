import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const backendUrl = getBackendApiUrl();

    const backendRes = await fetch(`${backendUrl}/api/v1/applications/${id}/resolve-checkpoint`, {
      method: "POST",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });

    const json = await backendRes.json().catch(() => ({}));
    return NextResponse.json(json, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to resolve checkpoint." },
      { status: 502 }
    );
  }
}
