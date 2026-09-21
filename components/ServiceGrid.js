"use client";

import Link from "next/link";
import { useWebsiteModal } from "@/components/WebsiteModalProvider";

const COLOR_CLASSES = {
  brandblue: { icon: "bg-brandblue/10 text-brandblue", cta: "text-brandblue" },
  brandpurple: { icon: "bg-brandpurple/10 text-brandpurple", cta: "text-brandpurple" },
  brandred: { icon: "bg-brandred/10 text-brandred", cta: "text-brandred" },
  brandgreen: { icon: "bg-brandgreen/10 text-brandgreen", cta: "text-brandgreen" },
  saffron: { icon: "bg-saffron/10 text-saffron", cta: "text-saffron" },
};

// type: "internal" -> Next.js route inside this app
// type: "external" -> opens in-app via WebsiteModalProvider (real, verified official site)
const SERVICES = [
  { title: "IRCTC & Ticket", subtitle: "Train, Bus, Flight, PNR", cta: "Book Now", color: "brandblue", type: "external", url: "https://www.irctc.co.in" },
  { title: "Jobs & Exams", subtitle: "Govt & Private Jobs", cta: "View Jobs", color: "brandpurple", type: "internal", href: "/jobs" },
  { title: "Admit Card", subtitle: "All Admit Cards", cta: "View All", color: "brandred", type: "internal", href: "/admit-card" },
  { title: "Results", subtitle: "All Results & Merit", cta: "View Results", color: "brandgreen", type: "internal", href: "/results" },
  { title: "Documents & Identity", subtitle: "PAN, DL, Passport", cta: "Explore", color: "brandblue", type: "internal", href: "/documents" },
  { title: "Land & Property", subtitle: "Khasra, Rasid, Bhumi", cta: "View", color: "saffron", type: "external", url: "https://bhulekh.gov.in" },
  { title: "Government Loan", subtitle: "Loan & Credit Services", cta: "Apply Now", color: "brandgreen", type: "external", url: "https://www.jansamarth.in" },
  { title: "Scholarship", subtitle: "Scholarship & Fee", cta: "Apply Now", color: "brandred", type: "external", url: "https://scholarships.gov.in" },
  { title: "Yojana & Benefits", subtitle: "Sarkari Yojana", cta: "View All", color: "saffron", type: "external", url: "https://www.myscheme.gov.in" },
  { title: "Insurance", subtitle: "Life, Health, Vehicle", cta: "View Plans", color: "brandblue", type: "external", url: "https://www.pmjay.gov.in" },
  { title: "Rasid & Payment", subtitle: "Online Rasid, Bill", cta: "Pay Now", color: "brandpurple", type: "external", url: "https://www.india.gov.in/topics/public-utilities" },
  { title: "More Services", subtitle: "All Online Services", cta: "Explore", color: "brandblue", type: "internal", href: "/documents" },
  // Standalone study/exam-prep app (public/padhai-ghar.html) — same-origin
  // static file, so it opens cleanly inside the existing website-modal
  // iframe (no X-Frame-Options issue like external govt sites have).
  { title: "Padhai Ghar", subtitle: "Exam Prep & Study", cta: "Start", color: "brandpurple", type: "static", url: "/padhai-ghar.html" },
];

export default function ServiceGrid() {
  const { openSite } = useWebsiteModal();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {SERVICES.map((s) => {
        const c = COLOR_CLASSES[s.color];
        const CardInner = (
          <>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold ${c.icon}`}>
              {s.title.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">{s.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.subtitle}</div>
            </div>
            <div className={`text-xs font-medium flex items-center gap-1 mt-auto ${c.cta}`}>
              {s.cta} →
            </div>
          </>
        );

        if (s.type === "internal") {
          return (
            <Link key={s.title} href={s.href} className="bg-white rounded-2xl p-4 shadow-card flex flex-col gap-3">
              {CardInner}
            </Link>
          );
        }
        if (s.type === "static") {
          return (
            <button
              key={s.title}
              onClick={() => openSite(s.url, s.title)}
              className="bg-white rounded-2xl p-4 shadow-card flex flex-col gap-3 text-left"
            >
              {CardInner}
            </button>
          );
        }
        return (
          <button
            key={s.title}
            onClick={() => openSite(s.url, s.title)}
            className="bg-white rounded-2xl p-4 shadow-card flex flex-col gap-3 text-left"
          >
            {CardInner}
          </button>
        );
      })}
    </div>
  );
}
