import { NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// GAP FIX: upsertSubscription() lib/db.js mein ban chuka tha lekin isko
// call karne wala koi route hi nahi tha — is route ke bina "WhatsApp/Email
// alert on karo" button kahin se bhi kaam nahi karta.
export async function POST(req) {
  const { mobile, email, whatsappOptIn, emailOptIn } = await req.json().catch(() => ({}));

  if (whatsappOptIn && !/^[6-9]\d{9}$/.test(mobile || "")) {
    return NextResponse.json({ error: "WhatsApp alerts ke liye sahi mobile number do." }, { status: 400 });
  }
  if (emailOptIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    return NextResponse.json({ error: "Sahi email address do." }, { status: 400 });
  }
  if (!whatsappOptIn && !emailOptIn) {
    return NextResponse.json({ error: "Kam se kam ek alert type chuno." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`subscribe:${ip}`, 10, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Bahut zyada requests. Thodi der baad try karo." }, { status: 429 });
  }

  const sub = await upsertSubscription({ mobile, email, whatsappOptIn, emailOptIn });
  return NextResponse.json({ ok: true, subscription: sub });
}
