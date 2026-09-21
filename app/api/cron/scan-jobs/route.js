import { NextResponse } from "next/server";
import { getJobs, addPendingJob } from "@/lib/db";
import { scanForNewJobs } from "@/lib/gemini";

// This is the "24x7" piece: an external scheduler (Vercel Cron, GitHub
// Actions, or any cron host) hits this URL every N minutes. It re-uses the
// same scan logic as the admin "Scan Now" button, but is protected by a
// shared secret (CRON_SECRET) instead of an admin login, since a scheduler
// can't log in.
//
// New jobs land in the pending queue for a human to approve, same as a
// manual scan — nothing publishes to the live site without that click.
// See CRON_AUTO_APPROVE below if you want to skip that step instead.
export async function POST(req) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
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

    return NextResponse.json({ ok: true, added, found: suggestions.length, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Scan fail ho gaya." }, { status: 500 });
  }
}

// Some cron hosts only send GET requests — support both.
export async function GET(req) {
  return POST(req);
}
