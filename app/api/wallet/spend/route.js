import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { debitWallet, activatePremiumForMobile } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

// Same catalogue as /api/payments/create-order — kept in sync manually
// since they're small. If you add a new plan there, add its price here too.
const SPENDABLE = {
  "premium-monthly": { amountPaise: 4900, label: "Premium — 1 Month" },
};

// POST /api/wallet/spend { purpose: "premium-monthly" }
//
// Yahi wo cheez hai jo "do baar paisa pay nahi karna" ka matlab hai: user ek
// baar wallet topup karta hai (real Razorpay payment), uske baad koi bhi
// in-app service (premium, etc) sirf ek click mein wallet balance se turant
// mil jaati hai — koi dobara card/UPI/OTP nahi. Isse aage govt-portal fee
// jaisi cheez automate NAHI hoti — wo hamesha user khud, apne bank OTP ke
// saath karega (yeh design formFillSession.js mein pehle se documented hai).
export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const rl = await checkRateLimit(`wallet-spend:${sessionUser.mobile}`, 10, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Bahut zyada attempts. Thodi der baad try karo." }, { status: 429 });
  }

  const { purpose } = await req.json().catch(() => ({}));
  const item = SPENDABLE[purpose];
  if (!item) {
    return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });
  }

  try {
    await debitWallet(sessionUser.mobile, item.amountPaise, `spend:${purpose}`);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Wallet debit fail ho gaya." }, { status: 400 });
  }

  if (purpose === "premium-monthly") {
    await activatePremiumForMobile(sessionUser.mobile, 30);
  }

  return NextResponse.json({ ok: true, activated: purpose });
}
