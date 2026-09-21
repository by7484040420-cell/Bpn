import { getDocumentById } from "@/data/documents";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ApplyFlow from "@/components/ApplyFlow";
import GovtServiceCheckout from "@/components/GovtServiceCheckout";
import { notFound } from "next/navigation";

export default function DocumentDetailPage({ params }) {
  const doc = getDocumentById(params.id);
  if (!doc) return notFound();

  const hasCombinedBilling = Boolean(doc.govtFeePaise && doc.serviceFeePaise);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24 flex flex-col gap-4">
        <div className="bg-navy rounded-2xl p-6 text-white">
          <div className="text-xs text-slate-300">{doc.department}</div>
          <h1 className="font-display font-bold text-2xl mt-1">{doc.title}</h1>
          <div className="text-slate-300 text-sm">{doc.subtitle}</div>
        </div>

        {hasCombinedBilling && <GovtServiceCheckout doc={doc} />}

        <div className="bg-amber-50 text-amber-700 text-xs rounded-xl px-4 py-3">
          ⚠️ AI sirf naam/address jaisi fields bharega. <b>OTP aur Captcha hamesha tumhe khud apne
          haath se bharna hoga</b> — yeh kabhi automate nahi hota, chahe kitni bhi baar try karo.
          {hasCombinedBilling
            ? " Government fee hum upar wale combined payment mein le lete hain aur apni taraf se pay karte hain — koi bot use NSDL/UTIITSL par nahi bharta, hamari team karti hai."
            : ""}
        </div>

        <ApplyFlow job={doc} />
      </main>
      <BottomNav />
    </>
  );
}
