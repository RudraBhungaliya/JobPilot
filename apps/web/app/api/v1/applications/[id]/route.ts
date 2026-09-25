import { NextResponse } from "next/server";
import { INITIAL_APPLICATIONS, Application } from "@/lib/mock-data";

// Shared state with list route
let memoryApplications: Application[] = [...INITIAL_APPLICATIONS];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = memoryApplications.find((a) => a.id === id);

  if (!app) {
    return NextResponse.json(
      { success: false, message: "Application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: app,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingIndex = memoryApplications.findIndex((a) => a.id === id);
    if (existingIndex === -1) {
      // If not in memory yet, create from fallback or return 404
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    const current = memoryApplications[existingIndex];
    const updated: Application = {
      ...current,
      ...body,
      lastUpdated: "Just now",
      telemetryLogs: [
        ...(current.telemetryLogs || []),
        ...(body.status && body.status !== current.status
          ? [
              {
                timestamp: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
                level: "INFO" as const,
                step: "STAGE_TRANSITION",
                detail: `Status moved from ${current.status} to ${body.status}.`,
              },
            ]
          : []),
      ],
    };

    memoryApplications[existingIndex] = updated;

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update application" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  memoryApplications = memoryApplications.filter((a) => a.id !== id);

  return NextResponse.json({
    success: true,
    message: "Application deleted",
  });
}
