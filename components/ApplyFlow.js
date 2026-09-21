"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useWebsiteModal } from "@/components/WebsiteModalProvider";
import { useAuth } from "@/components/AuthProvider";
import { getServiceFeePaise } from "@/data/documents";
import { Capacitor } from "@capacitor/core";

const FIELD_LABELS = {
  fullName: "Poora Naam",
  age: "Age",
  gender: "Gender",
  berthPreference: "Berth Preference",
  dob: "Janam Tithi (DD/MM/YYYY)",
  fatherName: "Pita ka Naam",
  address: "Pata",
  qualification: "Shiksha Yogyata",
  category: "Category",
  mobile: "Mobile Number",
  email: "Email",
  height: "Height (cm)",
  weight: "Weight (kg)",
};

const SELECT_OPTIONS = {
  gender: ["Male", "Female", "Other"],
  berthPreference: ["Lower", "Middle", "Upper", "Side Lower", "Side Upper", "No Preference"],
};

const UPLOAD_LABELS = {
  photo: "Passport-size Photo",
  signature: "Signature",
  idProof: "ID Proof (Aadhaar/Voter ID)",
  addressProof: "Address Proof",
};

const STEPS = ["Profile", "AI Review", "Apply"];

export default function ApplyFlow({ job }) {
  const { openSite } = useWebsiteModal();
  const { user, requireAuth } = useAuth();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({});
  const [uploads, setUploads] = useState({}); // { photo: { name, dataUrl }, ... }
  const [filled, setFilled] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);

  function handleGoToOfficialSite() {
    requireAuth(async () => {
      if (Capacitor.isNativePlatform()) {
        setAutoFilling(true);
        try {
          const { openAndAutoFill } = await import("@/lib/nativeAutoFill");
          await openAndAutoFill(job.officialUrl, filled);
        } catch (e) {
          // fallback agar plugin available na ho
          openSite(job.officialUrl, job.department || job.title);
        } finally {
          setAutoFilling(false);
        }
      } else {
        openSite(job.officialUrl, job.department || job.title);
      }
    });
  }

  // NEW: saved passenger names (jaise IRCTC/Tatkal ke liye) — ek baar save
  // kiya naam agli baar list se select ho jaata hai, dobara type nahi
  // karna padta. Sirf naam autofill karta hai — booking/submit hamesha
  // user khud official site par karta hai.
  const [savedPassengers, setSavedPassengers] = useState([]);
  const [savingName, setSavingName] = useState(false);
  const hasNameField = job.fields.includes("fullName");

  // Multi-page document forms (see data/documents.js getServiceFeePaise)
  // need a ₹49 service charge before AI will fill them; single-page forms
  // and downloads are free. `feeStatus` is null while loading, otherwise
  // { feePaise, paid }. This is a UX convenience only — the real gate is
  // server-side in /api/form-fill.
  const [feeStatus, setFeeStatus] = useState(null);
  const [payingFee, setPayingFee] = useState(false);
  const [feeError, setFeeError] = useState("");

  function loadFeeStatus() {
    fetch(`/api/payments/document-status?documentId=${encodeURIComponent(job.id)}`)
      .then((res) => res.json())
      .then(setFeeStatus)
      .catch(() => setFeeStatus({ feePaise: getServiceFeePaise(job), paid: false }));
  }
  useEffect(loadFeeStatus, [job.id, user]);

  function payFormFee() {
    requireAuth(() => startFormFeePayment());
  }

  async function startFormFeePayment() {
    setPayingFee(true);
    setFeeError("");
    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "form-fee", documentId: job.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Order nahi ban paaya.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: `${job.title} — AI Form-Fill Charge`,
        handler: async (response) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setFeeError(verifyData.error || "Payment verify nahi hua.");
            return;
          }
          loadFeeStatus();
        },
        theme: { color: "#1d4ed8" },
      });
      rzp.on("payment.failed", () => setFeeError("Payment fail ho gaya, phir try karo."));
      rzp.open();
    } catch (err) {
      setFeeError(err.message);
    } finally {
      setPayingFee(false);
    }
  }

  useEffect(() => {
    if (!user || !hasNameField) return;
    let cancelled = false;
    fetch("/api/passengers")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSavedPassengers(data.passengers || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, hasNameField]);

  async function saveCurrentPassenger() {
    const fullName = (profile.fullName || "").trim();
    if (!fullName) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          age: profile.age || "",
          gender: profile.gender || "",
          berthPreference: profile.berthPreference || "",
        }),
      });
      const data = await res.json();
      if (res.ok) setSavedPassengers((prev) => [data.passenger, ...prev]);
    } catch {
      // best-effort — profile step abhi bhi kaam karta rahega
    } finally {
      setSavingName(false);
    }
  }

  // Ek tap mein poora saved passenger (naam + age + gender + berth) fill
  // ho jaata hai — sirf naam nahi. Trigger hamesha USER ke tap se hota
  // hai, page load par khud se nahi — Tatkal jaisi jagah "form khulte hi
  // khud fill" jaanbujh kar nahi banaya (IRCTC ke rules ke against hai).
  function applySavedPassenger(p) {
    setProfile((prev) => ({
      ...prev,
      fullName: p.fullName,
      ...(job.fields.includes("age") ? { age: p.age || "" } : {}),
      ...(job.fields.includes("gender") ? { gender: p.gender || "" } : {}),
      ...(job.fields.includes("berthPreference") ? { berthPreference: p.berthPreference || "" } : {}),
    }));
  }

  async function removeSavedPassenger(id) {
    setSavedPassengers((prev) => prev.filter((p) => p.id !== id));
    fetch(`/api/passengers/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const allFieldsGiven = useMemo(
    () =>
      job.fields.every((f) => (profile[f] || "").trim().length > 0) &&
      (job.uploadFields || []).every((f) => !!uploads[f]),
    [profile, uploads, job.fields, job.uploadFields]
  );

  function handleFileChange(field, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploads((prev) => ({ ...prev, [field]: { name: file.name, dataUrl: reader.result } }));
    };
    reader.readAsDataURL(file);
  }

  function handleAIFill() {
    requireAuth(() => submitAIFill());
  }

  async function submitAIFill() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/form-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI fill failed");
      setFilled(data.filled);
      setStep(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-6 text-xs font-medium">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                i <= step ? "bg-navy text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= step ? "text-navy" : "text-slate-400"}>{s}</span>
            {i < STEPS.length - 1 && <span className="w-4 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-brandred/10 text-brandred text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500 mb-1">
            Ek baar apni details do — agli baar se ye sab jobs ke liye reuse hongi.
          </p>

          {hasNameField && savedPassengers.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1.5">
                Saved Passengers (tap karke poori details bharo)
              </div>
              <div className="flex flex-wrap gap-2">
                {savedPassengers.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 bg-slate-100 rounded-full pl-3 pr-1.5 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedPassenger(p)}
                      className="font-medium text-slate-700"
                    >
                      {p.fullName}
                      {p.age ? `, ${p.age}` : ""}
                      {p.gender ? `, ${p.gender}` : ""}
                    </button>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => removeSavedPassenger(p.id)}
                      className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] leading-4"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.fields.map((f) => (
            <div key={f}>
              <label className="text-xs font-medium text-slate-600">
                {FIELD_LABELS[f] || f}
              </label>
              {SELECT_OPTIONS[f] ? (
                <select
                  value={profile[f] || ""}
                  onChange={(e) => setProfile({ ...profile, [f]: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-navy bg-white"
                >
                  <option value="">Chuno...</option>
                  {SELECT_OPTIONS[f].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={profile[f] || ""}
                  onChange={(e) => setProfile({ ...profile, [f]: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-navy"
                />
              )}
              {f === "fullName" && hasNameField && user && (profile.fullName || "").trim() && (
                <button
                  type="button"
                  onClick={saveCurrentPassenger}
                  disabled={savingName}
                  className="text-xs text-brandblue font-medium mt-1"
                >
                  {savingName ? "Save ho raha hai…" : "+ Ye passenger agli baar ke liye save karo"}
                </button>
              )}
            </div>
          ))}
          {(job.uploadFields || []).map((f) => (
            <div key={f}>
              <label className="text-xs font-medium text-slate-600">
                {UPLOAD_LABELS[f] || f}
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(f, e.target.files?.[0])}
                className="w-full text-xs mt-1"
              />
              {uploads[f] && (
                <div className="text-xs text-brandgreen mt-1">✓ {uploads[f].name}</div>
              )}
            </div>
          ))}
          {feeStatus && !feeStatus.paid && feeStatus.feePaise > 0 ? (
            <>
              <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
              <div className="bg-amber-50 text-amber-700 text-xs rounded-xl px-4 py-3 mt-3">
                Ye ek multi-page form hai — AI se bharwane ke liye ₹{(feeStatus.feePaise / 100).toFixed(2)}
                ka one-time service charge hai. Single-page forms aur downloads hamesha free hain.
              </div>
              <button
                disabled={payingFee}
                onClick={payFormFee}
                className="mt-2 bg-amber-500 text-white rounded-full py-2.5 font-semibold text-sm disabled:opacity-60"
              >
                {payingFee ? "Loading..." : `₹${(feeStatus.feePaise / 100).toFixed(2)} Pay Karke AI se Bharo`}
              </button>
              {feeError && <div className="text-xs text-red-500 mt-1">{feeError}</div>}
            </>
          ) : (
            <button
              disabled={!allFieldsGiven || loading || !feeStatus}
              onClick={handleAIFill}
              className="mt-3 bg-navy text-white rounded-full py-2.5 font-semibold text-sm disabled:opacity-40"
            >
              {loading ? "AI form bhar raha hai…" : "✨ AI se Form Bharo (Free)"}
            </button>
          )}
        </div>
      )}

      {step === 1 && filled && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500 mb-1">
            AI ne values ready kar di hain — official portal app ke WebView me khulega aur supported fields khud fill honge.
          </p>
          {job.fields.map((f) => (
            <div key={f} className="flex justify-between border-b border-slate-100 py-2 text-sm">
              <span className="text-slate-500">{FIELD_LABELS[f] || f}</span>
              <span className="font-medium">{filled[f] ?? "—"}</span>
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-1">
            App ke andar AI text fields khud bhar dega (naam, mobile, address, etc.).
            Photo/signature/ID document hamesha tumhe khud upload karna hoga — koi bhi
            AI ya app ise automatic nahi kar sakta.
          </p>
          {job.officialUrl && (
            <button
              onClick={handleGoToOfficialSite}
              disabled={autoFilling}
              className="mt-1 bg-brandgreen text-white rounded-full py-2.5 font-semibold text-sm disabled:opacity-60"
            >
              {autoFilling ? "Site khol raha hai…" : "🤖 Official Website Kholo (AI Auto-Fill) →"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
