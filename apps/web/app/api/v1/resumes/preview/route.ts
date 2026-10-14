import { NextResponse } from "next/server";
import { getBackendApiUrl, getBackendHeaders } from "@/lib/api-config";

export async function POST(request: Request) {
  try {
    const incomingData = await request.formData();
    const forwardFormData = new FormData();
    for (const [key, value] of incomingData.entries()) {
      forwardFormData.append(key, value);
    }

    const headers = getBackendHeaders(request);
    delete (headers as any)["Content-Type"];
    delete (headers as any)["content-type"];

    const response = await fetch(`${getBackendApiUrl()}/api/v1/resumes/preview`, {
      method: "POST",
      headers,
      body: forwardFormData,
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
    return NextResponse.json(
      { success: false, message: err.message || "Resume parsing service is unavailable." },
      { status: 502 }
    );
  }
}
