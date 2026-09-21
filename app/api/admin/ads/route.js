import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAds, addAd } from "@/lib/db";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ ads: await getAds() });
}

export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  const { title, targetUrl } = body;
  if (!title || !targetUrl) {
    return NextResponse.json({ error: "Title aur target link zaroori hain." }, { status: 400 });
  }

  const ad = await addAd({
    title,
    imageUrl: body.imageUrl || "",
    targetUrl,
    placement: body.placement || "home-banner",
  });

  return NextResponse.json({ ad });
}
