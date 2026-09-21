import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteSavedPassenger } from "@/lib/db";

export async function DELETE(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }
  await deleteSavedPassenger(sessionUser.mobile, params.id);
  return NextResponse.json({ ok: true });
}
