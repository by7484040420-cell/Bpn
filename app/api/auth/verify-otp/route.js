import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyOtp, upsertUserLogin, createSession } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  const { mobile, otp } = await req.json().catch(() => ({}));

  if (!/^[6-9]\d{9}$/.test(mobile || "") || !/^\d{6}$/.test(otp || "")) {
    return NextResponse.json({ error: "Mobile ya OTP galat hai." }, { status: 400 });
  }

  // FIX: OTP sirf 6-digit hai — bina limit ke koi bhi 10 lakh combinations
  // brute-force try kar sakta tha 5 min ke andar. Ab 5 galat try ke baad
  // 10 min lock.
  const attempt = await checkRateLimit(`otp-verify:${mobile}`, 5, 600);
  if (!attempt.allowed) {
    return NextResponse.json(
      { error: "Bahut zyada galat attempts. 10 minute baad try karo." },
      { status: 429 }
    );
  }

  const ok = await verifyOtp(mobile, otp);
  if (!ok) {
    return NextResponse.json({ error: "OTP galat ya expire ho gaya." }, { status: 400 });
  }

  const user = await upsertUserLogin(mobile);
  const token = await createSession(mobile);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ user });
}
