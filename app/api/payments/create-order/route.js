import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSessionUser } from "@/lib/auth";
import { createPaymentOrder, createRemittance } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getDocumentById, getServiceFeePaise } from "@/data/documents";

// GAP FIX: koi payment gateway nahi tha. Razorpay use kar rahe hain (sabse
// common Indian payment gateway — UPI, cards, netbanking sab support karta
// hai out of the box). Do-step flow: (1) yahan order banao, (2) frontend
// Razorpay Checkout kholta hai, (3) success par /api/payments/verify hit
// hota hai jo signature verify karke premium activate karta hai.
const PLANS = {
  "premium-monthly": { amountPaise: 4900, label: "Premium — 1 Month" }, // ₹49
};

// Wallet topup amounts (₹). User inme se koi bhi amount choose kar sakta hai —
// arbitrary amount nahi, taaki koi paise ka amount typo na kar sake aur galat
// paisa wallet mein na daal de.
const WALLET_TOPUP_AMOUNTS_PAISE = [10000, 20000, 50000, 100000]; // ₹100/200/500/1000

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET set nahi hai.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const rl = await checkRateLimit(`payment-order:${sessionUser.id}`, 10, 600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Bahut zyada attempts. Thodi der baad try karo." }, { status: 429 });
  }

  const { plan = "premium-monthly", walletTopupPaise, documentId } = await req.json().catch(() => ({}));

  let amountPaise;
  let planKey = plan;
  let govtFeePaise, serviceFeePaise; // set for plan === "govt-service" or "form-fee"

  if (plan === "wallet-topup") {
    if (!WALLET_TOPUP_AMOUNTS_PAISE.includes(walletTopupPaise)) {
      return NextResponse.json({ error: "Invalid topup amount." }, { status: 400 });
    }
    amountPaise = walletTopupPaise;
    planKey = "wallet-topup";
  } else if (plan === "govt-service") {
    // Fee split ALWAYS comes from our own server-side document config —
    // never from the client — so nobody can request a ₹1 "combined fee"
    // by editing the request body.
    const doc = getDocumentById(documentId);
    if (!doc || !doc.govtFeePaise) {
      return NextResponse.json({ error: "Ye service abhi combined billing support nahi karti." }, { status: 400 });
    }
    govtFeePaise = doc.govtFeePaise;
    serviceFeePaise = getServiceFeePaise(doc);
    amountPaise = govtFeePaise + serviceFeePaise;
    planKey = "govt-service";
  } else if (plan === "form-fee") {
    // Generic AI-form-fill charge for documents that DON'T have a real govt
    // fee configured (GST, DL, ration card, etc) — just our ₹49, only when
    // getServiceFeePaise() says this document actually needs it (2+ page
    // form). Single-page forms and downloads are free — this plan simply
    // isn't used for those (see ServiceCheckout.js).
    const doc = getDocumentById(documentId);
    const fee = getServiceFeePaise(doc);
    if (!doc || fee <= 0) {
      return NextResponse.json({ error: "Ye service free hai, payment ki zaroorat nahi." }, { status: 400 });
    }
    serviceFeePaise = fee;
    amountPaise = fee;
    planKey = "form-fee";
  } else {
    const planDef = PLANS[plan];
    if (!planDef) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    amountPaise = planDef.amountPaise;
  }

  let razorpay;
  try {
    razorpay = getRazorpay();
  } catch (err) {
    return NextResponse.json({ error: "Payment abhi configure nahi hai." }, { status: 503 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `sub_${sessionUser.mobile}_${Date.now()}`,
    });

    await createPaymentOrder({
      mobile: sessionUser.mobile,
      razorpayOrderId: order.id,
      amountPaise,
      plan: planKey,
      documentId: planKey === "govt-service" || planKey === "form-fee" ? documentId : null,
    });

    if (planKey === "govt-service") {
      await createRemittance({
        mobile: sessionUser.mobile,
        documentId,
        razorpayOrderId: order.id,
        govtFeePaise,
        serviceFeePaise,
      });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      ...(planKey === "govt-service" ? { govtFeePaise, serviceFeePaise } : {}),
      ...(planKey === "form-fee" ? { serviceFeePaise } : {}),
    });
  } catch (err) {
    console.error("Razorpay order create failed:", err);
    return NextResponse.json({ error: "Order banane mein dikkat aa gayi." }, { status: 502 });
  }
}
