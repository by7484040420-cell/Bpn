import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "Terms of Use — Sarkari AI",
  description: "Sarkari AI use karne ke terms aur conditions.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24 prose prose-sm max-w-none">
        <h1 className="font-display font-bold text-2xl mb-4">Terms of Use</h1>
        <p className="text-slate-500 text-sm mb-6">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

        <h2 className="font-semibold text-lg mt-6 mb-2">Yeh ek unofficial platform hai</h2>
        <p>
          Sarkari AI kisi bhi sarkari department, ministry, ya PSU ka official
          portal nahi hai. Hum sirf publicly available job notifications ko
          ek jagah collect aur organize karte hain, taaki dhoondhna aasan ho.
          Final aur authoritative information hamesha respective official
          website par hi honi chahiye — apply karne se pehle official
          notification khud verify zaroor karein.
        </p>

        <h2 className="font-semibold text-lg mt-6 mb-2">AI-detected jobs</h2>
        <p>
          Kuch listings AI (Gemini) ke zariye internet scan karke detect ki
          jaati hain, aur publish hone se pehle ek admin manually review
          karta hai. Isके baawajood, last date/eligibility jaisi details mein
          galti ka chhota chance rehta hai — apply karne se pehle official
          link par confirm karna aapki zimmedari hai.
        </p>

        <h2 className="font-semibold text-lg mt-6 mb-2">Form-fill assistant</h2>
        <p>
          "AI se Form Bharo" feature sirf aapke khud diye hue values ko
          clean/format karta hai — koi naya data invent nahi karta. Final
          submit, OTP, captcha, aur payment hamesha aapke khud ke control
          mein rehta hai, official portal par.
        </p>

        <h2 className="font-semibold text-lg mt-6 mb-2">No liability</h2>
        <p>
          Hum information ko accurate rakhne ki poori koshish karte hain,
          lekin kisi bhi galti/delay/loss ke liye Sarkari AI zimmedar nahi
          hoga. Use at your own discretion.
        </p>

        <p className="mt-8 text-xs text-slate-400 border-t pt-4">
          Note: Yeh ek starting template hai, final launch se pehle isko ek
          qualified professional se review karwana recommended hai.
        </p>
      </main>
      <BottomNav />
    </>
  );
}
