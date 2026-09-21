"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CARD_THEME = {
  brandred: { border: "border-brandred", btn: "bg-brandred", glow: "shadow-[0_0_30px_rgba(226,44,44,0.35)]" },
  brandgreen: { border: "border-brandgreen", btn: "bg-brandgreen", glow: "shadow-[0_0_30px_rgba(26,163,94,0.35)]" },
  brandblue: { border: "border-brandblue", btn: "bg-brandblue", glow: "shadow-[0_0_30px_rgba(30,111,224,0.35)]" },
  brandpurple: { border: "border-brandpurple", btn: "bg-brandpurple", glow: "shadow-[0_0_30px_rgba(108,63,209,0.35)]" },
  saffron: { border: "border-saffron", btn: "bg-saffron", glow: "shadow-[0_0_30px_rgba(255,122,26,0.35)]" },
};

export default function JobCarousel({ jobs, intervalMs = 3000 }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % jobs.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [jobs.length, intervalMs]);

  function goTo(i) {
    clearInterval(timerRef.current);
    setActive(i);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % jobs.length);
    }, intervalMs);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-full max-w-xs h-80">
        {jobs.map((job, i) => {
          const theme = CARD_THEME[job.color] || CARD_THEME.brandblue;
          const isActive = i === active;
          return (
            <div
              key={job.id}
              className={`absolute inset-0 bg-navy-dark rounded-2xl border-2 ${theme.border} p-6 flex flex-col
                transition-all duration-700 ease-out
                ${isActive ? `opacity-100 translate-x-0 scale-100 ${theme.glow} z-10` : "opacity-0 translate-x-6 scale-95 z-0 pointer-events-none"}`}
            >
              <span className="self-end bg-brandred text-white text-[10px] font-bold px-2 py-0.5 rounded">
                NEW
              </span>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mt-2 mb-4 text-2xl">
                🏛️
              </div>
              <div className="text-white text-center font-display font-bold text-lg">
                {job.title}
              </div>
              <div className="text-slate-300 text-center text-sm mb-4">
                {job.subtitle}
              </div>
              <div className="text-slate-400 text-xs text-center mb-1">Last Date</div>
              <div className="text-white text-center font-semibold mb-4">{job.lastDate}</div>
              <Link
                href={`/jobs/${job.id}`}
                className={`${theme.btn} text-white text-center rounded-full py-2 font-semibold text-sm`}
              >
                Apply Now
              </Link>
              <div className="text-center text-xs text-slate-300 mt-3">
                ✨ भरें AI से
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {jobs.map((job, i) => (
          <button
            key={job.id}
            aria-label={`Show ${job.title}`}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === active ? "bg-navy w-6" : "bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
