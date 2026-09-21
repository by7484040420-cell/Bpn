"use client";

import { useState } from "react";
import Script from "next/script";

// GAP FIX: /api/payments/create-order aur /verify ban chuke the, lekin
// unko trigger karne wala koi button/checkout flow nahi tha. Yeh component
// Razorpay Checkout (client-side popup) load karta hai aur dono API calls
// ko jodta hai.
export default function PremiumButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function startPayment() {
    setLoading(true);
    setError("");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium-monthly" }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Order nahi ban paaya.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Sarkari AI Premium",
        description: "1 Month Premium — instant alerts, ad-free",
        handler: async (response) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setError(verifyData.error || "Payment verify nahi hua.");
            return;
          }
          setDone(true);
        },
        theme: { color: "#1d4ed8" },
      });
      rzp.on("payment.failed", () => setError("Payment fail ho gaya, phir try karo."));
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <div className="text-sm text-brandgreen font-medium">✅ Premium activate ho gaya!</div>;
  }

  return (
    <>
      {/* Razorpay's official checkout script — loaded once, only when this
          component is on the page. */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={startPayment}
        disabled={loading}
        className="bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading ? "Loading..." : "₹49/month — Premium banao"}
      </button>
      {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
    </>
  );
}
