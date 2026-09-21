const UPDATES = [
  "Railway Group D Form Start",
  "SSC CGL New Notification",
  "Bihar Police Exam Date Out",
  "UP Police New Vacancy",
];

export default function LiveTicker() {
  return (
    <div className="bg-white rounded-2xl shadow-card flex items-center overflow-hidden">
      <span className="bg-brandred text-white text-xs font-bold px-3 py-2 shrink-0">
        LIVE
      </span>
      <span className="pl-3 pr-2 text-sm font-medium shrink-0">
        Important Updates
      </span>
      <div className="flex-1 overflow-hidden whitespace-nowrap relative h-9">
        <div className="ticker-track absolute top-0 left-0 flex items-center h-9 gap-8 animate-[scroll_18s_linear_infinite]">
          {[...UPDATES, ...UPDATES].map((u, i) => (
            <span key={i} className="text-sm text-slate-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brandred inline-block" />
              {u}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
