import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { rejectPendingJob } from "@/lib/db";

export async function POST(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await rejectPendingJob(params.id);
  return NextResponse.json({ ok: true });
}
