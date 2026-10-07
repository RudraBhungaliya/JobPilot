import { NextRequest } from "next/server";

const BACKEND_API_URL = process.env.JOBPILOT_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

/**
 * SSE Streaming Proxy
 * Forwards live Server-Sent Events from backend to browser EventSource clients.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const authHeader = request.headers.get("authorization") || (token ? `Bearer ${token}` : "");

  const targetUrl = new URL(`${BACKEND_API_URL}/api/v1/events`);
  if (token) {
    targetUrl.searchParams.set("token", token);
  }

  try {
    const backendRes = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    if (!backendRes.ok || !backendRes.body) {
      return new Response(
        `data: ${JSON.stringify({ type: "stream_error", message: `Backend error ${backendRes.status}` })}\n\n`,
        {
          status: backendRes.status || 502,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    }

    return new Response(backendRes.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(
      `data: ${JSON.stringify({ type: "stream_error", message: err.message || "Failed to reach backend SSE" })}\n\n`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
}
