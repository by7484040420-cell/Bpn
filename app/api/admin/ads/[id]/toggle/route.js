import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleAd } from "@/lib/db";

export async function POST(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const ad = await toggleAd(params.id);
  if (!ad) return NextResponse.json({ error: "Ad nahi mila." }, { status: 404 });
  return NextResponse.json({ ad });
}
