// Notification worker — yeh Vercel/serverless par NAHI chalta (serverless
// functions long-running processes nahi ho sakte). Isko ek alag, always-on
// jagah chalao — jaise wahi Railway/Render instance jahan
// remote-browser-server chal raha hai, ya ek chhota alag VM. Chalane ka
// tareeka: `npm run worker` (SETUP-PADHO.md mein pura setup hai).
//
// .mjs extension jaanbujh kar hai — lib/db.js, lib/notify.js waghera sab
// ES module `export` syntax use karte hain (Next.js ka convention), aur
// yeh worker Next.js build ke bahar plain `node` se chalta hai, isliye
// isko khud ES module hona zaroori hai taaki wahi imports kaam karein.
import "dotenv/config";
import { Worker } from "bullmq";
import { getJobById, getSubscribersPage } from "./lib/db.js";
import { sendWhatsApp, sendEmail, whatsappConfigured, emailConfigured } from "./lib/notify.js";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };

const worker = new Worker(
  "job-alerts",
  async (bullJob) => {
    const { jobId, title } = bullJob.data;
    const job = await getJobById(jobId);
    if (!job) {
      console.warn(`Worker: job ${jobId} not found (deleted?), skipping.`);
      return;
    }

    const jobUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/jobs/${job.id}`;
    let sent = 0;
    let failed = 0;
    let offset = 0;
    const pageSize = 200;

    // Paginated so a large subscriber base doesn't get loaded into memory
    // at once, and so one slow batch doesn't block the whole worker.
    while (true) {
      const page = await getSubscribersPage(pageSize, offset);
      if (page.length === 0) break;

      for (const sub of page) {
        try {
          if (sub.whatsapp_opt_in && sub.mobile && whatsappConfigured) {
            await sendWhatsApp(sub.mobile, title);
            sent++;
          }
          if (sub.email_opt_in && sub.email && emailConfigured) {
            await sendEmail(sub.email, title, jobUrl);
            sent++;
          }
        } catch (err) {
          failed++;
          console.error(`Notify failed for subscriber ${sub.id}:`, err.message);
        }
      }
      offset += pageSize;
    }

    console.log(`Job alert "${title}": sent=${sent} failed=${failed}`);
  },
  { connection, concurrency: 1 }
);

worker.on("failed", (bullJob, err) => {
  console.error(`Notification job ${bullJob?.id} failed:`, err.message);
});

console.log("📨 Notification worker running, waiting for job-alerts queue...");
