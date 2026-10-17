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

    const url = new URL(req.url);
    const checkpointToken = req.headers.get("x-checkpoint-token") || url.searchParams.get("token") || body?.token || "";

    const backendEndpoint = checkpointToken
      ? `${backendUrl}/api/v1/applications/${id}/resolve-checkpoint?token=${encodeURIComponent(checkpointToken)}`
      : `${backendUrl}/api/v1/applications/${id}/resolve-checkpoint`;

    const backendRes = await fetch(backendEndpoint, {
      method: "POST",
      headers: getBackendHeaders(req, {
        "Content-Type": "application/json",
        ...(checkpointToken ? { "X-Checkpoint-Token": checkpointToken } : {}),
      }),
      body: JSON.stringify({ ...body, ...(checkpointToken ? { token: checkpointToken } : {}) }),
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
