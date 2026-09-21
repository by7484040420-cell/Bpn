import { NextResponse } from "next/server";
import { getDocumentById } from "@/data/documents";

// AI form-fill preparation endpoint.
// The actual official portal stays in the user's Android WebView.
// This API never opens a remote browser or submits anything to a government portal.
export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId, profile = {} } = body || {};
    const job = jobId ? getDocumentById(jobId) : null;

    // Keep only fields explicitly allowed for the selected service.
    const allowed = job?.fields || Object.keys(profile);
    const filled = {};

    for (const field of allowed) {
      if (profile[field] !== undefined && profile[field] !== null) {
        filled[field] = String(profile[field]).trim();
      }
    }

    return NextResponse.json({
      success: true,
      filled,
      message: "AI profile ready. Official portal will open in the app WebView."
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error?.message || "AI fill failed" },
      { status: 400 }
    );
  }
}
