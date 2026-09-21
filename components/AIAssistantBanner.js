import Link from "next/link";

export default function AIAssistantBanner() {
  return (
    <div className="bg-navy rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-12 h-12 rounded-full bg-brandpurple flex items-center justify-center text-xl">
          🤖
        </div>
        <div>
          <div className="font-display font-bold flex items-center gap-2">
            Bipin AI Assistant
            <span className="text-[10px] bg-brandblue px-1.5 py-0.5 rounded font-semibold">AI</span>
          </div>
          <div className="text-slate-300 text-sm">Aapka Personal Sarkari Sahayak</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:flex md:items-center gap-4 text-sm text-slate-200 flex-1">
        <div>
          <div className="font-medium text-white">AI se Form Bharo</div>
          <div className="text-xs text-slate-400">Fast &amp; Accurate</div>
        </div>
        <div>
          <div className="font-medium text-white">Document Help</div>
          <div className="text-xs text-slate-400">Guidance 24x7</div>
        </div>
        <div>
          <div className="font-medium text-white">Job Match</div>
          <div className="text-xs text-slate-400">Best for You</div>
        </div>
        <div>
          <div className="font-medium text-white">Smart Alerts</div>
          <div className="text-xs text-slate-400">Never Miss Any Update</div>
        </div>
      </div>

      <Link
        href="/ai-assistant"
        className="bg-white text-navy font-semibold rounded-full px-5 py-2.5 text-sm text-center shrink-0"
      >
        AI se Poochho →
      </Link>
    </div>
  );
}
