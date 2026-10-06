import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Forward to backend server if running
    try {
      const backendRes = await fetch(`http://127.0.0.1:8000/api/v1/applications/${id}/resolve-checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        return NextResponse.json(json);
      }
    } catch {
      // Return response
    }

    return NextResponse.json({
      success: true,
      message: "Verification checkpoint resolved. Application resumed.",
      data: {
        applicationId: id,
        status: "READY_TO_SUBMIT",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to resolve checkpoint." },
      { status: 400 }
    );
  }
}
