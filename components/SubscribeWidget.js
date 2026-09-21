"use client";

import { useState } from "react";

// GAP FIX: /api/subscribe route ban gaya tha, lekin usko call karne wala
// koi UI nahi tha — is component ke bina WhatsApp/email alerts on karna
// user ke liye possible hi nahi tha.
export default function SubscribeWidget() {
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, email, whatsappOptIn, emailOptIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kuch galat ho gaya.");
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="bg-brandgreen/10 border border-brandgreen/30 rounded-xl p-4 text-sm text-brandgreen font-medium">
        ✅ Alerts on ho gaye! Naya job aate hi message milega.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-4 space-y-3">
      <div className="font-semibold text-sm">Naye job ka alert paao</div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} />
        WhatsApp par
      </label>
      {whatsappOptIn && (
        <input
          type="tel"
          placeholder="10-digit mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
        Email par
      </label>
      {emailOptIn && (
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {error && <div className="text-xs text-red-500">{error}</div>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-brandblue text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
      >
        {status === "loading" ? "Save ho raha hai..." : "Alerts On Karo"}
      </button>
    </form>
  );
}
