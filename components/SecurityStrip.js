const POINTS = [
  { icon: "🛡️", label: "100% Secure Platform" },
  { icon: "🔒", label: "Data Encrypted" },
  { icon: "✅", label: "Safe & Trusted" },
  { icon: "🔐", label: "Private & Secure" },
];

export default function SecurityStrip() {
  return (
    <div className="bg-navy-dark text-white rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex flex-wrap gap-5">
        {POINTS.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span>{p.icon}</span> {p.label}
          </span>
        ))}
      </div>
      <span className="flex items-center gap-1.5 text-saffron font-medium">
        🛡️ Aapka Data, Aapka Vishwas
      </span>
    </div>
  );
}
