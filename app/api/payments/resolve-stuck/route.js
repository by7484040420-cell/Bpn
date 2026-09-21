import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSessionUser } from "@/lib/auth";
import {
  getPaymentByOrderId,
  getRecentPaymentsByMobile,
  creditWallet,
  activatePremiumForMobile,
  createSupportTicket,
  resolveSupportTicket,
} from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

// ============================================================================
// "Paisa fas gaya" resolver.
//
// WHAT THIS CAN DO: if a payment was actually captured by Razorpay (money
// really left the user's account into OUR account) but our own system
// failed to credit the wallet / activate premium for it — e.g. the user's
// browser closed before the /verify call ran — this auto-fixes THAT specific
// gap, because we can prove from Razorpay's own API that the money is ours
// to credit.
//
// WHAT THIS CANNOT DO, EVER:
//  - It cannot pull money from a government portal, another company's
//    payment gateway, or anyone's bank account. Only refunds/credits tied to
//    OUR OWN Razorpay account are possible.
//  - It cannot use a PAN card / driving licence / passport as a payment
//    instrument — those aren't payment methods, so there's nothing to check
//    them against here.
//  - It never blindly trusts the user's claim. Every action below is gated
//    on what Razorpay's API itself reports for that order.
// ============================================================================

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

  const rl = await checkRateLimit(`resolve-stuck:${sessionUser.mobile}`, 5, 900);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Bahut zyada attempts. 15 minute baad try karo, ya admin se contact karo." },
      { status: 429 }
    );
  }

  const { razorpayOrderId, note } = await req.json().catch(() => ({}));

  // Find the payment record: either the one the user pointed at, or their
  // most recent one if they didn't give an order id.
  let payment = razorpayOrderId ? await getPaymentByOrderId(razorpayOrderId) : null;
  if (!payment) {
    const recent = await getRecentPaymentsByMobile(sessionUser.mobile, 1);
    payment = recent[0] || null;
  }

  if (!payment || payment.mobile !== sessionUser.mobile) {
    return NextResponse.json({
      resolved: false,
      message: "Koi payment record nahi mila aapke account mein. Agar aapne payment kiya hai, order ID ya payment ID share karo.",
    });
  }

  const ticket = await createSupportTicket({
    mobile: sessionUser.mobile,
    razorpayOrderId: payment.razorpay_order_id,
    issue: note || "Stuck payment reported via chat",
  });

  // Already fixed on our side — nothing to do.
  if (payment.status === "paid") {
    await resolveSupportTicket(ticket.id, "auto-resolved", "Payment already credited on our records.");
    return NextResponse.json({
      resolved: true,
      message: `Ye payment (₹${(payment.amount_paise / 100).toFixed(2)}) already successfully credited hai aapke account mein. Agar phir bhi service nahi mil rahi, screenshot ke saath batao.`,
    });
  }

  let razorpay;
  try {
    razorpay = getRazorpay();
  } catch {
    await resolveSupportTicket(ticket.id, "needs-admin", "Razorpay not configured on server.");
    return NextResponse.json({
      resolved: false,
      message: "Payment system abhi check nahi ho pa raha. Ticket admin ko bhej diya hai, jaldi contact honge.",
    });
  }

  // Ask Razorpay directly what actually happened to this order — this is
  // the one source of truth, never the user's description of events.
  let order, payments;
  try {
    order = await razorpay.orders.fetch(payment.razorpay_order_id);
    payments = await razorpay.orders.fetchPayments(payment.razorpay_order_id);
  } catch (err) {
    await resolveSupportTicket(ticket.id, "needs-admin", `Razorpay lookup failed: ${err.message || err}`);
    return NextResponse.json({
      resolved: false,
      message: "Razorpay se order detail nahi mil paayi. Ticket bana diya hai, admin dekh lenge.",
    });
  }

  const capturedPayment = (payments?.items || []).find((p) => p.status === "captured");

  if (!capturedPayment) {
    // No money actually reached us — nothing to refund or credit. This is
    // the common "I tried to pay but it failed" case, not a stuck payment.
    await resolveSupportTicket(
      ticket.id,
      "rejected",
      `No captured payment found. Order status: ${order.status}.`
    );
    return NextResponse.json({
      resolved: false,
      message:
        "Razorpay ke record ke hisaab se ye payment successful hi nahi hua tha (ya to fail ho gaya ya cancel) — isliye paisa cut hi nahi hua. Agar bank statement mein deduction dikh raha hai, apne bank se check karo, wo humare paas nahi aaya.",
    });
  }

  // Money genuinely reached us but our own system didn't credit it —
  // fix that gap now, using the exact plan/amount from OUR payment row
  // (not something the user can influence).
  try {
    if (payment.plan === "wallet-topup") {
      await creditWallet(sessionUser.mobile, payment.amount_paise, "refund-credit-fix", capturedPayment.id);
    } else {
      await activatePremiumForMobile(sessionUser.mobile, 30);
    }
  } catch (err) {
    await resolveSupportTicket(ticket.id, "needs-admin", `Auto-credit failed: ${err.message || err}`);
    return NextResponse.json({
      resolved: false,
      message: "Payment mila hua confirm hua, lekin credit karte waqt dikkat aa gayi. Admin ko ticket bhej diya hai.",
    });
  }

  await resolveSupportTicket(
    ticket.id,
    "auto-resolved",
    `Captured payment ${capturedPayment.id} found but was never credited — credited now.`
  );

  return NextResponse.json({
    resolved: true,
    message: `Confirm ho gaya — aapka ₹${(payment.amount_paise / 100).toFixed(2)} ka payment Razorpay par successful tha but humare system ne credit nahi kiya tha. Ab credit kar diya hai.`,
  });
}
