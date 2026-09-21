"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const TOPUP_OPTIONS = [
  { paise: 10000, label: "₹100" },
  { paise: 20000, label: "₹200" },
  { paise: 50000, label: "₹500" },
  { paise: 100000, label: "₹1000" },
];

export default function WalletWidget() {
  const [balancePaise, setBalancePaise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBalance() {
    try {
      const res = await fetch("/api/wallet");
      if (!res.ok) return; // not logged in, etc — widget just stays quiet
      const data = await res.json();
      setBalancePaise(data.balancePaise);
    } catch {
      // ignore — non-critical
    }
  }

  useEffect(() => {
    loadBalance();
  }, []);

  async function topUp(paise) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "wallet-topup", walletTopupPaise: paise }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Order nahi ban paaya.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Sarkari AI Wallet Topup",
        description: "Wallet mein paisa jodo — UPI, card ya netbanking se",
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
          setMessage("Wallet mein paisa aa gaya!");
          loadBalance();
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

  async function buyPremiumFromWallet() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "premium-monthly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wallet se purchase nahi hua.");
      setMessage("Premium activate ho gaya — wallet se, ek click mein!");
      loadBalance();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (balancePaise === null) return null; // not logged in / still loading

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">Wallet Balance</span>
        <span className="font-display font-bold text-lg">₹{(balancePaise / 100).toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {TOPUP_OPTIONS.map((opt) => (
          <button
            key={opt.paise}
            onClick={() => topUp(opt.paise)}
            disabled={loading}
            className="bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            + {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={buyPremiumFromWallet}
        disabled={loading || balancePaise < 4900}
        className="w-full bg-navy text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        Wallet se Premium lo (₹49) — bina dobara pay kiye
      </button>

      {balancePaise < 4900 && (
        <p className="text-[11px] text-slate-400 mt-1">Premium lene ke liye pehle wallet top up karo.</p>
      )}
      {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
      {message && <div className="text-xs text-brandgreen mt-2">{message}</div>}
    </div>
  );
}
