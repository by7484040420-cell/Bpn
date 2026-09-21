"use client";

import { useWebsiteModal } from "@/components/WebsiteModalProvider";

// FIX: pulled out of app/results/page.js — a page file can't have both
// `export const metadata` (server-only) and `"use client"` (needed here
// for the onClick/openSite interactivity) in the same file. This small
// client component holds just the interactive part; the page itself stays
// a server component so its metadata (page title) works again.
export default function ResultsList({ results }) {
  const { openSite } = useWebsiteModal();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {results.map((r) => (
        <button
          key={r.title}
          onClick={() => openSite(r.url, r.title)}
          className="text-left bg-white rounded-xl shadow-card p-4 flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-sm">{r.title}</div>
            <div className="text-xs text-slate-400">{r.meta}</div>
          </div>
          <span className="text-brandgreen text-sm font-medium">Check →</span>
        </button>
      ))}
    </div>
  );
}
