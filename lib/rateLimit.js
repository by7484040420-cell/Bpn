import { Pool } from "pg";

// FIX: koi bhi route par rate limiting nahi thi — OTP endpoint, AI form-fill,
// aur admin scan-jobs (jo Gemini API credits kharch karta hai) sab bina
// limit ke thay. Koi bhi script OTP endpoint ko loop mein maar kar SMS
// credits khatam kar sakta tha, ya scan-jobs ko baar-baar call karke Gemini
// bill udा sakta tha. Yeh ek simple, serverless-safe (DB-backed, na ki
// in-memory — Vercel jaisi jagah har request alag instance pe ja sakti hai)
// sliding-window limiter hai.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max: 5,
});

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        rl_key TEXT NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        count INT NOT NULL DEFAULT 1,
        PRIMARY KEY (rl_key, window_start)
      );
    `);
  }
  return ready;
}

/**
 * Sliding-window-ish (fixed bucket) rate limit check.
 * @param {string} key - unique bucket key, e.g. "otp:9876543210" or "otp-ip:1.2.3.4"
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowSeconds - window size in seconds
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkRateLimit(key, limit, windowSeconds) {
  await ensureTable();

  // Bucket the current time into fixed windows so we can use a cheap
  // upsert instead of scanning/expiring rows on every request.
  const bucketMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / bucketMs) * bucketMs);

  const res = await pool.query(
    `INSERT INTO rate_limits (rl_key, window_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (rl_key, window_start)
     DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, windowStart]
  );

  const count = res.rows[0].count;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

// Best-effort client IP extraction behind Vercel/most proxies.
export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
