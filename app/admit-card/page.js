"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useWebsiteModal } from "@/components/WebsiteModalProvider";

// BUG FIX: Header aur BottomNav dono "/admit-card" par link karte the, lekin
// yeh page kabhi bana hi nahi tha — isliye tap karte hi 404 aata tha. Isi
// pattern par bana diya jaisa /results page hai (same static-list style,
// jab tak admit-card DB-backed nahi banta).
const ADMIT_CARDS = [
  { title: "SSC CGL 2026 Admit Card", meta: "Exam: 10 Aug 2026", url: "https://ssc.gov.in" },
  { title: "Railway RRB NTPC Admit Card", meta: "Exam: 22 Aug 2026", url: "https://www.rrbapply.gov.in" },
  { title: "IBPS PO Prelims Admit Card", meta: "Exam: 15 Aug 2026", url: "https://www.ibps.in" },
  { title: "UP Police Constable Admit Card", meta: "Exam: 28 Aug 2026", url: "https://uppbpb.gov.in" },
];

export default function AdmitCardPage() {
  const { openSite } = useWebsiteModal();
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <h1 className="font-display font-bold text-xl mb-4">Admit Cards</h1>
        <div className="grid sm:grid-cols-2 gap-3">
          {ADMIT_CARDS.map((a) => (
            <button
              key={a.title}
              onClick={() => openSite(a.url, a.title)}
              className="text-left bg-white rounded-xl shadow-card p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-slate-400">{a.meta}</div>
              </div>
              <span className="text-brandgreen text-sm font-medium">Download →</span>
            </button>
          ))}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
