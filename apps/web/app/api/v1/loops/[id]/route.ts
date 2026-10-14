import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops/${id}`, {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops/${id}`, {
      method: "PATCH",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update loop on backend." },
      { status: 502 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/v1/loops/${id}`, {
      method: "DELETE",
      headers: getBackendHeaders(req, { "Content-Type": "application/json" }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete loop on backend." },
      { status: 502 }
    );
  }
}
