"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Jobs", href: "/jobs", icon: "💼" },
  { label: "Admit Card", href: "/admit-card", icon: "🪪" },
  { label: "Results", href: "/results", icon: "🏆" },
  { label: "AI Assistant", href: "/ai-assistant", icon: "🤖" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex md:hidden z-40">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? "text-navy font-semibold" : "text-slate-400"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
