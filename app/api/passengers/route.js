import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSavedPassengers, addSavedPassenger } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

// NEW: saved passenger list — user ek baar naam save karta hai (jaise
// IRCTC ki apni "Saved Passengers" list), phir har baar type karne ke
// bajaye list se select karta hai. Yeh sirf autofill data hai, ye khud
// koi ticket book nahi karta.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }
  const passengers = await getSavedPassengers(sessionUser.mobile);
  return NextResponse.json({ passengers });
}

export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const rl = await checkRateLimit(`add-passenger:${sessionUser.id}`, 20, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Bahut zyada attempts. Thodi der baad try karo." }, { status: 429 });
  }

  const { fullName, age, gender, berthPreference } = await req.json().catch(() => ({}));
  if (!fullName || !fullName.trim()) {
    return NextResponse.json({ error: "Naam likhna zaroori hai." }, { status: 400 });
  }
  if (age && !/^\d{1,3}$/.test(age)) {
    return NextResponse.json({ error: "Age sirf number mein do." }, { status: 400 });
  }

  try {
    const passenger = await addSavedPassenger(sessionUser.mobile, { fullName, age, gender, berthPreference });
    return NextResponse.json({ passenger });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Save nahi ho paya." }, { status: 500 });
  }
}
