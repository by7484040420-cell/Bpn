import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AIChat from "@/components/AIChat";
import WalletWidget from "@/components/WalletWidget";

export const metadata = { title: "Bipin AI Assistant" };

export default function AIAssistantPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24 flex flex-col gap-4">
        <h1 className="font-display font-bold text-xl">Bipin AI Assistant</h1>
        <WalletWidget />
        <AIChat />
        <p className="text-[11px] text-slate-400">
          Payment stuck lag raha hai? Chat mein seedha likho — jaise "mera paisa fas gaya" —
          Bipin AI turant tumhare Razorpay record check karke batayega.
        </p>
      </main>
      <BottomNav />
    </>
  );
}
