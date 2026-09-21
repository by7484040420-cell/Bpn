"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const MENU_LINKS = [
  { label: "Jobs & Exams", href: "/jobs" },
  { label: "Admit Card", href: "/admit-card" },
  { label: "Results", href: "/results" },
  { label: "Documents & Identity", href: "/documents" },
  { label: "State Portals", href: "/states" },
  { label: "AI Assistant", href: "/ai-assistant" },
];

export default function Header() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, requireAuth, logout } = useAuth();
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/jobs?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="bg-navy text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-3 relative">
        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1 shrink-0"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute top-full left-4 mt-1 bg-white text-slate-700 rounded-xl shadow-2xl py-2 w-56 z-50">
            {MENU_LINKS.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-slate-50"
              >
                {m.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-brandred flex items-center justify-center font-display font-extrabold text-lg">
            B
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-display font-bold text-lg">BIPIN AI</div>
            <div className="text-[11px] text-slate-300 -mt-1">
              Sab Kuchh, Ek Jagah
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center bg-white rounded-full px-4 py-2 gap-2 max-w-xl"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="11" cy="11" r="7" stroke="#64748B" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Job, Admit Card, Result, Ticket, PAN, DL..."
            className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
          />
        </form>

        {/* Notification system abhi is app mein nahi bana hai — isliye fake count nahi
            dikhate. Jab real notification backend judega, yahan badge wapas aayega. */}
        <Link href="/jobs" aria-label="Notifications" className="relative p-2 shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M13.7 21a2 2 0 01-3.4 0" stroke="white" strokeWidth="2" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <div className="w-9 h-9 rounded-full bg-slate-300 overflow-hidden" />
              <div className="hidden md:block leading-tight text-sm">
                <div>Hi, +91 {user.mobile} 👋</div>
                <button onClick={logout} className="text-saffron text-xs font-medium">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => requireAuth(() => {})}
              className="bg-brandred rounded-full px-4 py-1.5 text-sm font-semibold"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
