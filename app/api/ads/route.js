import { NextResponse } from "next/server";
import { getActiveAdsByPlacement } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const placement = searchParams.get("placement") || "";
  const ads = await getActiveAdsByPlacement(placement);
  return NextResponse.json({ ads });
}
