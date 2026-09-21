"use client";

import { useEffect, useState } from "react";

function maskMobile(mobile) {
  return `${mobile.slice(0, 2)}xxxxx${mobile.slice(-3)}`;
}

const TABS = [
  { key: "users", label: "Users" },
  { key: "jobs", label: "Jobs" },
  { key: "pending", label: "AI Review Queue" },
  { key: "ads", label: "Ads" },
  { key: "remittances", label: "Govt Fee Remittances" },
];

export default function AdminDashboard({ adminMobile }) {
  const [tab, setTab] = useState("users");

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl">Admin Panel</h1>
          <p className="text-sm text-slate-500">Logged in as {adminMobile}</p>
        </div>
        <a href="/" className="text-sm text-brandblue font-medium">
          ← Website par wapas
        </a>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
              tab === t.key ? "bg-navy text-white" : "bg-white text-slate-500 shadow-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "pending" && <PendingTab />}
      {tab === "ads" && <AdsTab />}
      {tab === "remittances" && <RemittancesTab />}
    </main>
  );
}

// ===================== USERS TAB (original functionality) =====================
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUsers(data.users);
        setStats(data.stats);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <p className="text-sm text-slate-400">Load ho raha hai...</p>}
      {error && (
        <div className="bg-brandred/10 text-brandred text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Aaj Signup" value={stats.signupsToday} />
          <StatCard label="Aaj Active" value={stats.activeToday} />
        </div>
      )}

      {users.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-sm">Registered Users</h2>
            <button onClick={() => setReveal((r) => !r)} className="text-xs text-brandblue font-medium">
              {reveal ? "Mask numbers" : "Full numbers dikhao"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium">Signup</th>
                  <th className="px-4 py-2 font-medium">Last Login</th>
                  <th className="px-4 py-2 font-medium">Logins</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-mono">{reveal ? u.mobile : maskMobile(u.mobile)}</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(u.createdAt).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 text-slate-500">{new Date(u.lastLoginAt).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{u.loginCount || 1}</td>
                    <td className="px-4 py-2">
                      {u.isAdmin ? (
                        <span className="bg-navy text-white text-[11px] rounded-full px-2 py-0.5">Admin</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== JOBS TAB =====================
function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", department: "", lastDate: "", officialUrl: "" });
  const [msg, setMsg] = useState("");

  function loadJobs() {
    setLoading(true);
    fetch("/api/admin/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data.jobs || []))
      .finally(() => setLoading(false));
  }
  useEffect(loadJobs, []);

  async function handleAdd() {
    if (!form.title || !form.lastDate || !form.officialUrl) {
      setMsg("Title, last date aur official link zaroori hain.");
      return;
    }
    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.job) {
      setMsg("✅ Job add ho gaya.");
      setForm({ title: "", department: "", lastDate: "", officialUrl: "" });
      loadJobs();
    } else {
      setMsg(data.error || "Kuch galat ho gaya.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Ye job delete karna hai?")) return;
    await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    loadJobs();
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
        <h2 className="font-semibold text-sm mb-3">➕ Naya Job Add Karo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Job title (jaise SSC CGL 2026)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Last date (jaise Check official site)"
            value={form.lastDate}
            onChange={(e) => setForm({ ...form, lastDate: e.target.value })}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Official website link (https://...)"
            value={form.officialUrl}
            onChange={(e) => setForm({ ...form, officialUrl: e.target.value })}
          />
        </div>
        <button onClick={handleAdd} className="mt-3 bg-brandgreen text-white rounded-lg px-4 py-2 text-sm font-semibold">
          Job Add Karo
        </button>
        {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-sm">Sab Live Jobs ({jobs.length})</h2>
        </div>
        {loading && <p className="text-sm text-slate-400 px-4 py-4">Load ho raha hai...</p>}
        {!loading && jobs.length === 0 && <p className="text-sm text-slate-400 px-4 py-4">Koi job nahi hai.</p>}
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{j.title}</div>
              <div className="text-xs text-slate-500">{j.department} · {j.lastDate}</div>
            </div>
            <button onClick={() => handleDelete(j.id)} className="text-xs text-brandred font-semibold ml-3 shrink-0">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== AI REVIEW QUEUE TAB =====================
function PendingTab() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  function loadPending() {
    setLoading(true);
    fetch("/api/admin/pending-jobs")
      .then((res) => res.json())
      .then((data) => setPending(data.pendingJobs || []))
      .finally(() => setLoading(false));
  }
  useEffect(loadPending, []);

  async function scanNow() {
    setScanning(true);
    setScanMsg("");
    try {
      const res = await fetch("/api/admin/scan-jobs", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setScanMsg(data.error);
      } else {
        setScanMsg(`✅ ${data.added} naya suggestion mila (${data.found} check kiye).`);
        loadPending();
      }
    } catch (e) {
      setScanMsg("Scan fail ho gaya, dobara try karo.");
    } finally {
      setScanning(false);
    }
  }

  async function approve(id) {
    await fetch(`/api/admin/pending-jobs/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    loadPending();
  }
  async function reject(id) {
    await fetch(`/api/admin/pending-jobs/${id}/reject`, { method: "POST" });
    loadPending();
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-semibold text-sm">🤖 AI ne dhoonde naye jobs</h2>
        <button
          onClick={scanNow}
          disabled={scanning}
          className="text-xs bg-brandblue/10 text-brandblue font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap disabled:opacity-50"
        >
          {scanning ? "Scan ho raha hai…" : "🔍 Scan Now"}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-1">
        Ye items automated source-check se detect hote hain. Yahan se Approve dabane
        par hi live hote hain — koi bhi cheez apne aap live nahi hoti.
      </p>
      <p className="text-xs text-brandred/80 mb-4">
        ⚠️ Approve karne se pehle officialUrl khud check kar lo — AI suggestion ka link kabhi galat ya khaali ho sakta hai.
      </p>
      {scanMsg && <p className="text-xs text-slate-500 mb-3">{scanMsg}</p>}
      {loading && <p className="text-sm text-slate-400">Load ho raha hai...</p>}
      {!loading && pending.length === 0 && (
        <p className="text-sm text-slate-400">Abhi review ke liye kuch nahi hai. "Scan Now" dabao.</p>
      )}
      {pending.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{p.title}</div>
            <div className="text-xs text-slate-500">{p.department}</div>
            <div className="text-xs mt-0.5">
              {p.officialUrl ? (
                <a href={p.officialUrl} target="_blank" rel="noopener noreferrer" className="text-brandblue">
                  {p.officialUrl}
                </a>
              ) : (
                <span className="text-brandred">Koi official link nahi — approve se pehle khud dhoondo aur admin/Jobs se add karo</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{new Date(p.detectedAt).toLocaleString("en-IN")}</div>
          </div>
          <div className="flex gap-2 shrink-0 ml-3">
            <button onClick={() => approve(p.id)} className="text-xs bg-brandgreen/10 text-brandgreen font-semibold px-3 py-1.5 rounded-lg">
              Approve
            </button>
            <button onClick={() => reject(p.id)} className="text-xs bg-brandred/10 text-brandred font-semibold px-3 py-1.5 rounded-lg">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== ADS TAB =====================
function AdsTab() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", imageUrl: "", targetUrl: "", placement: "home-banner" });
  const [msg, setMsg] = useState("");

  function loadAds() {
    setLoading(true);
    fetch("/api/admin/ads")
      .then((res) => res.json())
      .then((data) => setAds(data.ads || []))
      .finally(() => setLoading(false));
  }
  useEffect(loadAds, []);

  async function handleAdd() {
    if (!form.title || !form.targetUrl) {
      setMsg("Title aur target link zaroori hain.");
      return;
    }
    const res = await fetch("/api/admin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ad) {
      setMsg("✅ Ad add ho gaya.");
      setForm({ title: "", imageUrl: "", targetUrl: "", placement: "home-banner" });
      loadAds();
    } else {
      setMsg(data.error || "Kuch galat ho gaya.");
    }
  }

  async function handleToggle(id) {
    await fetch(`/api/admin/ads/${id}/toggle`, { method: "POST" });
    loadAds();
  }
  async function handleDelete(id) {
    if (!confirm("Ye ad delete karna hai?")) return;
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
    loadAds();
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
        <h2 className="font-semibold text-sm mb-3">📢 Naya Ad Add Karo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Ad title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={form.placement}
            onChange={(e) => setForm({ ...form, placement: e.target.value })}
          >
            <option value="home-banner">Home Banner</option>
            <option value="job-list">Job List ke beech</option>
            <option value="sidebar">Sidebar</option>
          </select>
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2"
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2"
            placeholder="Ad click karne par kahan jaaye (https://...)"
            value={form.targetUrl}
            onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
          />
        </div>
        <button onClick={handleAdd} className="mt-3 bg-brandgreen text-white rounded-lg px-4 py-2 text-sm font-semibold">
          Ad Add Karo
        </button>
        {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-sm">Sab Ads ({ads.length})</h2>
        </div>
        {loading && <p className="text-sm text-slate-400 px-4 py-4">Load ho raha hai...</p>}
        {!loading && ads.length === 0 && <p className="text-sm text-slate-400 px-4 py-4">Koi ad nahi hai.</p>}
        {ads.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {a.title} {!a.active && <span className="text-slate-400 font-normal">(Inactive)</span>}
              </div>
              <div className="text-xs text-slate-500">{a.placement}</div>
            </div>
            <div className="flex gap-2 shrink-0 ml-3">
              <button onClick={() => handleToggle(a.id)} className="text-xs bg-brandpurple/10 text-brandpurple font-semibold px-3 py-1.5 rounded-lg">
                {a.active ? "Off Karo" : "On Karo"}
              </button>
              <button onClick={() => handleDelete(a.id)} className="text-xs text-brandred font-semibold">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function RemittancesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refInputs, setRefInputs] = useState({}); // { [id]: string }
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/remittances")
      .then((res) => res.json())
      .then((data) => setItems(data.remittances || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function markDone(id) {
    const reference = (refInputs[id] || "").trim();
    if (!reference) {
      setMsg("Reference/acknowledgement number daalo pehle (govt portal ki receipt se).");
      return;
    }
    const res = await fetch(`/api/admin/remittances/${id}/mark-done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const data = await res.json();
    if (data.ok) {
      setMsg("✅ Remittance mark ho gayi.");
      load();
    } else {
      setMsg(data.error || "Kuch galat ho gaya.");
    }
  }

  return (
    <div>
      <div className="bg-amber-50 text-amber-700 text-xs rounded-xl px-4 py-3 mb-4">
        Ye woh amounts hain jo users se combined-billing mein collect ho chuke hain (govt fee + service
        fee) — govt-fee wala part abhi tak actual government portal ko nahi bheja gaya. Tumhe khud NSDL/
        UTIITSL/Parivahan par apne login se jaake ye fee pay karni hai, phir yahan receipt/acknowledgement
        number daal ke "Remitted" mark karo.
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Koi pending remittance nahi hai.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-card p-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{r.document_id}</span>
                <span className="text-slate-400">{maskMobile(r.mobile)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Govt fee: ₹{(r.govt_fee_paise / 100).toFixed(2)} · Service fee: ₹{(r.service_fee_paise / 100).toFixed(2)}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Govt portal receipt / ack. number"
                  value={refInputs[r.id] || ""}
                  onChange={(e) => setRefInputs({ ...refInputs, [r.id]: e.target.value })}
                />
                <button
                  onClick={() => markDone(r.id)}
                  className="bg-navy text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Remitted mark karo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="text-xs text-brandgreen mt-3">{msg}</p>}
    </div>
  );
}
