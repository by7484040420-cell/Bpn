"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { officialPortals } from "@/data/states";
import { documentServices } from "@/data/documents";
import { useWebsiteModal } from "@/components/WebsiteModalProvider";

export default function StatesPage() {
  const { openSite } = useWebsiteModal();
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <h1 className="font-display font-bold text-xl mb-2">Official Recruitment Portals</h1>
        <p className="text-sm text-slate-500 mb-4">
          Ye sab links verified aur official government websites ke hain. Bipin AI kabhi
          bhi in websites ke bina permission data submit nahi karta.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {officialPortals.map((p) => (
            <button
              key={p.id}
              onClick={() => openSite(p.url, p.name)}
              className="bg-white rounded-xl shadow-card p-4 flex flex-col gap-1 text-left"
            >
              <span className="text-xs text-brandblue font-semibold">{p.scope}</span>
              <span className="font-semibold text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        <h2 className="font-display font-bold text-lg mt-8 mb-2">Document Services</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {documentServices.map((d) => (
            <button
              key={d.id}
              onClick={() => openSite(d.officialUrl, d.title)}
              className="bg-white rounded-xl shadow-card p-4 flex flex-col gap-1 text-left"
            >
              <span className="font-semibold text-sm">{d.title}</span>
              <span className="text-xs text-slate-500">{d.subtitle}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Aapka state list me nahi hai? Aur states dheere-dheere verify karke add kiye ja
          rahe hain — galat link dene se better hai thoda wait karna.
        </p>
      </main>
      <BottomNav />
    </>
  );
}
