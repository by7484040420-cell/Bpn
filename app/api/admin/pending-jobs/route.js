import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPendingJobs } from "@/lib/db";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ pendingJobs: await getPendingJobs() });
}
