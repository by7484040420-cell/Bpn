"use client";

import { useEffect, useState } from "react";

// Pehle admin panel se ads add/on-off/delete ho sakte the, lekin poori
// website me kahin bhi koi component /api/ads call hi nahi karta tha —
// isliye ads kabhi dikhte hi nahi the. Yeh component wahi missing piece hai:
// diye gaye "placement" ke active ads fetch karke dikhata hai. Kuch na ho
// to kuch bhi render nahi karta (page khaali nahi tootta).
export default function AdBanner({ placement }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads?placement=${encodeURIComponent(placement)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAds(data.ads || []);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  if (ads.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      {ads.map((ad) => (
        <a
          key={ad.id}
          href={ad.targetUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="bg-white rounded-2xl shadow-card overflow-hidden flex items-center gap-3 p-3 relative"
        >
          <span className="absolute top-1.5 right-2 text-[9px] font-semibold text-slate-300 tracking-wide">
            AD
          </span>
          {ad.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          )}
          <span className="text-sm font-medium">{ad.title}</span>
        </a>
      ))}
    </div>
  );
}
