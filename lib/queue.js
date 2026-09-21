import { Queue } from "bullmq";

// GAP FIX: koi Redis/queue system nahi tha. Yeh matter karta hai kyunki
// "job approve karo" request ko WAIT nahi karna chahiye jab tak 10,000
// subscribers ko WhatsApp/email bheji na jaaye — us hisaab se admin panel
// timeout ho jaata. Ab approve turant hoti hai, aur notification fan-out
// background mein queue se hoti hai (retries ke saath, agar WhatsApp/email
// provider down ho to).
//
// Requires a Redis instance — Upstash (free tier, serverless-friendly) ya
// koi bhi standard Redis (Railway, Redis Cloud, self-hosted) chalega.
// REDIS_URL env mein daalo.

let connectionOpts = null;
function getConnectionOpts() {
  if (!connectionOpts) {
    if (!process.env.REDIS_URL) {
      console.warn("⚠️ REDIS_URL set nahi hai — notification queue kaam nahi karegi. SETUP-PADHO.md dekho.");
    }
    connectionOpts = { url: process.env.REDIS_URL || "redis://localhost:6379" };
  }
  return connectionOpts;
}

let notificationQueue = null;
export function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = new Queue("job-alerts", {
      connection: getConnectionOpts(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    });
  }
  return notificationQueue;
}

/**
 * Enqueues one fan-out job for a newly-approved job posting. The actual
 * per-subscriber sending happens in worker.js (a separate long-running
 * process — see SETUP-PADHO.md for where to run it).
 */
export async function enqueueJobAlert(job) {
  const queue = getNotificationQueue();
  await queue.add("fan-out", { jobId: job.id, title: job.title }, { jobId: `alert-${job.id}` });
}
