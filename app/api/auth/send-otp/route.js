import { NextResponse } from "next/server";
import { createOtp } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// FIX: koi rate limit nahi thi — ab per-mobile (3/10min) aur per-IP
// (10/10min) dono limit lagi hain, taaki ek number ya ek IP OTP spam na
// kar sake (SMS credits + DB dono bachte hain).
export async function POST(req) {
  const { mobile } = await req.json().catch(() => ({}));

  if (!/^[6-9]\d{9}$/.test(mobile || "")) {
    return NextResponse.json({ error: "Sahi 10-digit mobile number do." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const [byMobile, byIp] = await Promise.all([
    checkRateLimit(`otp:${mobile}`, 3, 600),
    checkRateLimit(`otp-ip:${ip}`, 10, 600),
  ]);
  if (!byMobile.allowed) {
    return NextResponse.json(
      { error: "Bahut zyada attempts. 10 minute baad try karo." },
      { status: 429 }
    );
  }
  if (!byIp.allowed) {
    return NextResponse.json(
      { error: "Bahut zyada requests is network se. Thodi der baad try karo." },
      { status: 429 }
    );
  }

  const code = await createOtp(mobile);

  // FIX (security): pehle, SMS_API_KEY set na hone par OTP seedha is
  // response mein (`devOtp`) wapas chala jaata tha — koi bhi kisi ke bhi
  // number se OTP maang kar, wahi OTP khud dekh ke us number se login kar
  // sakta tha. Ab yeh sirf local development mein hi bhejte hain
  // (NODE_ENV !== "production"). Production/live deployment mein — chahe
  // SMS gateway set ho ya na ho — OTP kabhi bhi API response mein nahi
  // jaata. Matlab: production mein agar SMS provider configure nahi hai,
  // to login kaam nahi karega (jaisa hona chahiye) — silently insecure
  // rehne ke bajaye.
  const isProd = process.env.NODE_ENV === "production";
  const smsConfigured = Boolean(process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY);

  if (smsConfigured) {
    try {
      await sendSmsOtp(mobile, code);
    } catch (err) {
      console.error("SMS send failed:", err);
      // OTP DB mein ban chuka hai; SMS provider down hone par bhi user ko
      // vague 500 dikhane ke bajaye clear error dete hain.
      return NextResponse.json(
        { error: "SMS bhejne mein dikkat aa gayi. Thodi der baad try karo." },
        { status: 502 }
      );
    }
  } else if (isProd) {
    // Production mein SMS gateway configure hi nahi hai — OTP kisiko nahi
    // bheja ja sakta. Yahi sahi behaviour hai: login block karo, OTP
    // response mein leak mat karo.
    console.error("FAST2SMS_API_KEY/SMS_API_KEY set nahi hai production mein — OTP nahi bheja ja saka.");
    return NextResponse.json(
      { error: "Abhi login available nahi hai, thodi der baad try karo." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    // devOtp sirf local dev mein bhejte hain (kabhi production mein nahi),
    // aur sirf tab jab koi real SMS gateway bhi configure nahi hai.
    devOtp: !isProd && !smsConfigured ? code : undefined,
  });
}

async function sendSmsOtp(mobile, code) {
  // Fast2SMS ko priority — free/cheap trial credits ke saath easy setup,
  // isliye ise pehle try karte hain. FAST2SMS_API_KEY set karo Fast2SMS
  // dashboard se (fast2sms.com) — DLT-approved OTP route use karna, generic
  // route nahi (generic route bulk-promo ke liye hai, OTP ke liye reliably
  // deliver nahi hota).
  if (process.env.FAST2SMS_API_KEY) {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: process.env.FAST2SMS_API_KEY,
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: code,
        numbers: mobile,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.return !== true) {
      throw new Error(`Fast2SMS error: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return;
  }

  // Fallback: MSG91 v5 flow API shape, agar SMS_API_KEY (MSG91) set kiya ho
  // Fast2SMS ke bajaye.
  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: process.env.SMS_API_KEY,
    },
    body: JSON.stringify({
      mobile: `91${mobile}`,
      otp: code,
      template_id: process.env.SMS_TEMPLATE_ID || undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SMS provider error (${res.status}): ${text.slice(0, 200)}`);
  }
}
