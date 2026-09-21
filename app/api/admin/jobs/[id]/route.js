import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteJob } from "@/lib/db";

export async function DELETE(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const jobs = await deleteJob(params.id);
  return NextResponse.json({ jobs });
}
