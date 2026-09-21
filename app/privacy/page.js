import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "Privacy Policy — Sarkari AI",
  description: "Sarkari AI par aapka data kaise store aur use hota hai.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24 prose prose-sm max-w-none">
        <h1 className="font-display font-bold text-2xl mb-4">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-6">Last updated: {new Date().toLocaleDateString("en-IN")}</p>

        <p>
          Sarkari AI ("hum", "hamara") is site ko chalate hain jahan sarkari job
          listings, admit card aur result links milte hain. Yeh policy batati hai
          ki hum kya data collect karte hain aur usko kaise use karte hain.
        </p>

        <h2 className="font-semibold text-lg mt-6 mb-2">Hum kya collect karte hain</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mobile number — login/OTP ke liye</li>
          <li>Form-fill ke waqt aapne khud jo details typed kiye (naam, DOB, address, etc.) — sirf us application/form ke liye use hote hain, hamare paas store nahi hote unless aap khud save karte ho</li>
          <li>Basic usage data (kaunse pages dekhe) — site improve karne ke liye</li>
        </ul>

        <h2 className="font-semibold text-lg mt-6 mb-2">Hum kya NAHI karte</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Aapka data kisi third-party ko sell nahi karte</li>
          <li>Aadhaar/PAN jaise sensitive ID numbers hum store nahi karte — form-fill AI sirf aapke type kiye hue values clean karta hai, khud kuch generate nahi karta</li>
          <li>Payment ya OTP jo official government portal par hota hai, wahan hum involve nahi hote — aap seedha official site par karte ho</li>
        </ul>

        <h2 className="font-semibold text-lg mt-6 mb-2">Ads</h2>
        <p>
          Site par ads dikh sakte hain jo humare ad partners serve karte hain,
          jo apni-apni privacy policy follow karte hain.
        </p>

        <h2 className="font-semibold text-lg mt-6 mb-2">Contact</h2>
        <p>Koi sawaal ho to app ke Contact/Support section se sampark karein.</p>

        <p className="mt-8 text-xs text-slate-400 border-t pt-4">
          Note: Yeh ek starting template hai — final launch se pehle isko ek
          qualified professional se review karwana recommended hai, khaaskar
          agar aap OTP/mobile data ya AI-generated content handle kar rahe ho.
        </p>
      </main>
      <BottomNav />
    </>
  );
}
