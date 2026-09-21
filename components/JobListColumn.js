const ACCENT_TEXT = {
  brandred: "text-brandred",
  brandgreen: "text-brandgreen",
  brandpurple: "text-brandpurple",
  saffron: "text-saffron",
};

export default function JobListColumn({ title, icon, accent, items, viewAllLabel, viewAllHref }) {
  const accentClass = ACCENT_TEXT[accent] || "text-brandblue";
  return (
    <div className="bg-white rounded-2xl shadow-card flex flex-col overflow-hidden">
      <div className={`px-4 py-3 font-semibold flex items-center gap-2 ${accentClass}`}>
        <span>{icon}</span>
        {title}
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.title} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{item.title}</span>
              {item.tag && (
                <span className="text-[10px] font-bold bg-brandred/10 text-brandred px-1.5 py-0.5 rounded">
                  {item.tag}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{item.meta}</div>
          </div>
        ))}
      </div>
      <a
        href={viewAllHref}
        className={`text-center text-sm font-medium py-3 border-t border-slate-100 ${accentClass}`}
      >
        {viewAllLabel} →
      </a>
    </div>
  );
}
