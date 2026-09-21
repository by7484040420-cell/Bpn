import { getJobs } from "@/lib/db";

// GAP FIX: koi sitemap.xml nahi tha — is category mein 90% traffic Google
// organic search se aata hai, aur bina sitemap ke Google ko naye job pages
// discover karne mein hafton lag sakte hain. Next.js 14 mein yeh file khud
// /sitemap.xml route ban jaati hai.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function sitemap() {
  const staticRoutes = [
    "",
    "/jobs",
    "/admit-card",
    "/results",
    "/documents",
    "/states",
    "/ai-assistant",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/jobs" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));

  let jobRoutes = [];
  try {
    // Sitemaps cap at 50k URLs; well within range for a growing job list,
    // and cheap since it's one indexed query.
    const jobs = await getJobs({ limit: 5000 });
    jobRoutes = jobs.map((job) => ({
      url: `${SITE_URL}/jobs/${job.id}`,
      lastModified: job.createdAt ? new Date(job.createdAt) : new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));
  } catch (err) {
    // DB down par bhi static sitemap kaam kare, khaali crash na ho.
    console.error("sitemap: failed to load jobs", err);
  }

  return [...staticRoutes, ...jobRoutes];
}
