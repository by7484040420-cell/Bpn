import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/auth";
import { markPaymentPaid, getPaymentByOrderId } from "@/lib/db";

// Verifies the HMAC signature Razorpay Checkout returns after a successful
// payment — this is what actually proves the payment is real (never trust
// a "success" callback from the browser alone, it must be signature-checked
// server-side, or anyone could fake a premium unlock by calling this API
// directly with made-up IDs).
export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await req.json().catch(() => ({}));

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Payment details incomplete." }, { status: 400 });
  }

  const existing = await getPaymentByOrderId(razorpay_order_id);
  if (!existing || existing.mobile !== sessionUser.mobile) {
    return NextResponse.json({ error: "Order nahi mila." }, { status: 404 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.warn(`Payment signature mismatch for order ${razorpay_order_id}`);
    return NextResponse.json({ error: "Signature verify nahi hui." }, { status: 400 });
  }

  const payment = await markPaymentPaid({ razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id });
  return NextResponse.json({ ok: true, payment });
}
