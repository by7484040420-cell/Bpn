import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getJobs, addPendingJob } from "@/lib/db";
import { scanForNewJobs } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

// FIX: "AI Review Queue" tab pehle se UI/API (list/approve/reject) rakhta
// tha, lekin koi bhi cheez kabhi addPendingJob() call hi nahi karti thi —
// isliye queue hamesha khaali rehta tha. Yeh route wahi missing trigger hai.
export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  // FIX: koi limit nahi thi — admin panel se ya scheduled cron se accidental
  // rapid double-clicks/retries Gemini quota/bill udा sakte the. 5 scans
  // per 10 min kaafi hai (cron khud 30 min pe chalta hai).
  const rl = await checkRateLimit("admin-scan-jobs", 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Scan bahut baar ho chuka hai, thodi der baad try karo." },
      { status: 429 }
    );
  }

  try {
    // Just a recent sample as a hint for Gemini — the DB's unique index on
    // pending_jobs (lower(title)) is what actually prevents duplicates,
    // so this doesn't need to (and at 10k+ jobs, shouldn't) list everything.
    const existingTitles = (await getJobs({ limit: 300 })).map((j) => j.title);
    const suggestions = await scanForNewJobs(existingTitles);

    let added = 0;
    for (const s of suggestions) {
      if (!s?.title) continue;
      const item = await addPendingJob({
        title: s.title,
        department: s.department || "",
        subtitle: s.subtitle || "",
        lastDate: s.lastDate || "Check official site",
        officialUrl: s.officialUrl || "",
        color: "brandblue",
        logo: "govt",
        fields: ["fullName", "dob", "fatherName", "address", "qualification", "category", "mobile", "email"],
      });
      if (item) added++;
    }

    return NextResponse.json({ ok: true, added, found: suggestions.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Scan fail ho gaya." },
      { status: 500 }
    );
  }
}
