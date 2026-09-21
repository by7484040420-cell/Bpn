import { NextResponse } from "next/server";
import { getJobs } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Homepage only needs the latest few, so cap it — no reason to pull
  // thousands of rows for a "top 4" widget.
  const jobs = await getJobs({ limit: 20 });
  return NextResponse.json({ jobs });
}
