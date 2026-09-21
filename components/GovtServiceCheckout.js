"use client";

import { useState } from "react";
import Script from "next/script";

// Shown on document pages that have govtFeePaise/serviceFeePaise configured
// (see data/documents.js). Single payment, but the bill is always broken
// down honestly — user sees exactly how much is the real government fee
// vs our service charge, before paying anything.
export default function GovtServiceCheckout({ doc }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const totalPaise = doc.govtFeePaise + doc.serviceFeePaise;

  async function pay() {
    setLoading(true);
    setError("");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "govt-service", documentId: doc.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Order nahi ban paaya.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: `${doc.title} — Government Fee + Service`,
        description: `Govt fee ₹${(order.govtFeePaise / 100).toFixed(2)} + Service ₹${(order.serviceFeePaise / 100).toFixed(2)}`,
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
    return (
      <div className="bg-white rounded-2xl shadow-card p-4 text-sm">
        <p className="text-brandgreen font-medium mb-1">✅ Payment ho gaya.</p>
        <p className="text-slate-500 text-xs">
          Government fee wala ₹{(doc.govtFeePaise / 100).toFixed(2)} hamare authorized team ke through
          NSDL/UTIITSL par pay ho jayega — usually kuch ghanton mein. Status yahan update ho jayega.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h3 className="font-semibold text-sm mb-3">Ek payment mein poora bill</h3>
      <div className="text-sm flex justify-between text-slate-600">
        <span>Government fee</span>
        <span>₹{(doc.govtFeePaise / 100).toFixed(2)}</span>
      </div>
      <div className="text-sm flex justify-between text-slate-600 mb-2">
        <span>Sarkari AI service charge</span>
        <span>₹{(doc.serviceFeePaise / 100).toFixed(2)}</span>
      </div>
      <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold text-sm mb-4">
        <span>Total</span>
        <span>₹{(totalPaise / 100).toFixed(2)}</span>
      </div>
      <button
        onClick={pay}
        disabled={loading}
        className="w-full bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading ? "Loading..." : `₹${(totalPaise / 100).toFixed(2)} Pay Karo`}
      </button>
      <p className="text-[11px] text-slate-400 mt-2">
        Government fee ka hissa hum khud NSDL/UTIITSL par pay karte hain, tumhe dobara wahan jaake pay
        nahi karna. Ye instant nahi hota — hamari team confirm karke pay karti hai, isliye thoda time
        lagta hai.
      </p>
      {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
    </div>
  );
}
