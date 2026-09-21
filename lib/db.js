import { Pool } from "pg";

// Real Postgres database instead of a flat JSON file — this is what makes
// 10,000+ jobs safe: every write is a small indexed row update, not a
// rewrite of one giant file, and lookups (duplicate-title checks, search)
// use indexes instead of scanning everything in JS.
//
// Works with any standard Postgres — Neon, Supabase, Vercel Postgres,
// Railway, or your own server. Just set DATABASE_URL in .env.
if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️ DATABASE_URL set nahi hai — .env mein add karo. Setup steps: SETUP-PADHO.md dekho."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most hosted Postgres providers (Neon, Supabase, Vercel Postgres) require
  // SSL and use certs that Node's default trust chain doesn't have — this
  // matches how their own connection-string examples suggest connecting.
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max: 5,
});

let schemaReady = null;

// Creates tables + indexes on first use. Safe to call repeatedly (IF NOT
// EXISTS everywhere) — this means you never have to run a separate
// migration step manually, it just self-heals on first request.
function ensureSchema() {
  if (!schemaReady) {
    // FIX: Next.js builds several pages in parallel worker processes, each
    // calling ensureSchema() at nearly the same time. Running the same
    // multi-table ALTER TABLE/CREATE TABLE migration from several
    // connections at once can deadlock Postgres (each transaction grabs a
    // lock on one table and waits for a lock on another, in a different
    // order) — that's the "deadlock detected" build error. A Postgres
    // advisory lock forces only ONE process to actually run the migration
    // at a time; everyone else just waits their turn instead of racing.
    //
    // Important: advisory locks are tied to ONE specific database
    // connection/session, not to the app in general. Using pool.query()
    // separately for the lock and the unlock could hand out two different
    // connections from the pool, so the "unlock" would silently do nothing
    // and the lock would stay held. To avoid that, we check out a single
    // dedicated client and use it for the lock, the migration, AND the
    // unlock, then return it to the pool.
    schemaReady = (async () => {
      const client = await pool.connect();
      try {
        await client.query(`SELECT pg_advisory_lock(727277001)`);
        try {
          await client.query(`
      -- gen_random_uuid() is built into Postgres 13+, but this makes sure
      -- it's available even on older/restricted setups.
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      -- FIX: search query pehle "lower(title) LIKE '%q%'" karta tha. Ek
      -- LEADING % ke saath koi bhi normal btree index (idx_jobs_title_lower
      -- jo pehle tha) kaam nahi karta — Postgres har baar POORI jobs table
      -- scan karta, aur 1 lakh rows par yeh visibly slow ho jaata (search
      -- karte hi lag mehsoos hoga). pg_trgm extension + GIN index se
      -- '%beech-mein-kahin%' search bhi index se milta hai, 100k+ rows par
      -- bhi.
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        department TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        last_date TEXT DEFAULT '',
        official_url TEXT DEFAULT '',
        color TEXT DEFAULT 'brandblue',
        logo TEXT DEFAULT 'govt',
        fields JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
      -- Trigram GIN indexes — makes "WHERE title ILIKE '%anything%'" fast
      -- at any table size, unlike a plain btree index.
      CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_jobs_department_trgm ON jobs USING gin (department gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_jobs_subtitle_trgm ON jobs USING gin (subtitle gin_trgm_ops);

      CREATE TABLE IF NOT EXISTS pending_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        department TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        last_date TEXT DEFAULT '',
        official_url TEXT DEFAULT '',
        color TEXT DEFAULT 'brandblue',
        logo TEXT DEFAULT 'govt',
        fields JSONB DEFAULT '[]',
        detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_jobs_title_lower
        ON pending_jobs ((lower(title)));
      -- FIX: pending_jobs list ORDER BY detected_at DESC LIMIT 500 karta
      -- tha bina kisi index ke — AI scan roz naye pending jobs daalta rahega
      -- to yeh table bhi badhegi, isko bhi index kar diya.
      CREATE INDEX IF NOT EXISTS idx_pending_jobs_detected_at ON pending_jobs (detected_at DESC);

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT UNIQUE NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        login_count INT NOT NULL DEFAULT 1
      );

      -- NEW: saved passenger profiles — user ek baar naam/details save
      -- karta hai, phir IRCTC/Tatkal jaisi jagah baar-baar type karne ke
      -- bajaye list se select kar sakta hai. Yeh sirf AUTOFILL data hai —
      -- booking khud yeh table nahi karti, user hi official site par
      -- final submit karta hai (formFillSession.js wala design same rehta
      -- hai — CAPTCHA/OTP/payment kabhi automate nahi hote).
      CREATE TABLE IF NOT EXISTS saved_passengers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_mobile TEXT NOT NULL REFERENCES users(mobile) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        age TEXT DEFAULT '',
        gender TEXT DEFAULT '',
        berth_preference TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_saved_passengers_mobile ON saved_passengers (user_mobile, created_at DESC);

      CREATE TABLE IF NOT EXISTS ads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        target_url TEXT NOT NULL,
        placement TEXT NOT NULL DEFAULT 'home-banner',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ads_placement_active ON ads (placement, active);

      CREATE TABLE IF NOT EXISTS otps (
        mobile TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        mobile TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- NEW: job-alert subscriptions (WhatsApp/email). Separate from
      -- 'users' because someone can subscribe by email without ever
      -- logging in via mobile OTP.
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT,
        email TEXT,
        whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
        email_opt_in BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_has_contact CHECK (mobile IS NOT NULL OR email IS NOT NULL)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_mobile ON subscriptions (mobile) WHERE mobile IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions (email) WHERE email IS NOT NULL;

      -- NEW: Razorpay order/payment tracking for premium (instant WhatsApp
      -- alerts, ad-free, etc — whatever plan you attach this to).
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT NOT NULL,
        razorpay_order_id TEXT NOT NULL UNIQUE,
        razorpay_payment_id TEXT,
        amount_paise INT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'premium-monthly',
        status TEXT NOT NULL DEFAULT 'created',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        paid_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_payments_mobile ON payments (mobile);

      -- Track premium on the user row itself, since that's what every
      -- page already checks via getSessionUser().
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

      -- NEW: in-app wallet. User Razorpay se ek baar paisa wallet mein daalta
      -- hai (topup), phir wahi balance app ke andar premium/services kharidne
      -- ke liye use hota hai — baar baar Razorpay checkout khol ke card/UPI
      -- dobara enter nahi karna padta. Balance paise (integer) mein store
      -- hota hai taaki rounding issues na aayein.
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance_paise INT NOT NULL DEFAULT 0;

      -- Har wallet credit/debit ka audit trail — kabhi bhi "mera paisa kahan
      -- gaya" poochhne par yahan se poora history dikha sakte hain. Isse
      -- wallet_balance_paise column kabhi "just trust me" nahi rehta.
      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT NOT NULL REFERENCES users(mobile) ON DELETE CASCADE,
        amount_paise INT NOT NULL, -- positive = credit, negative = debit
        balance_after_paise INT NOT NULL,
        reason TEXT NOT NULL, -- e.g. 'topup', 'refund-credit', 'spend:premium-monthly'
        razorpay_payment_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_wallet_ledger_mobile ON wallet_ledger (mobile, created_at DESC);

      -- NEW: "paisa fas gaya" chat flow yahan log hota hai. Yeh kabhi bhi
      -- andhaadhundh refund/credit nahi deta — sirf hamare apne Razorpay
      -- records ke against verify karke ya to auto-fix karta hai (payment
      -- capture hua tha but service credit nahi hui thi) ya admin ke liye
      -- ticket bana deta hai. Third-party (govt portal) ka paisa yeh kabhi
      -- nahi chhoo sakta — sirf apne Razorpay account tak simit hai.
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT NOT NULL,
        razorpay_order_id TEXT,
        issue TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open', -- open | auto-resolved | refunded | needs-admin | rejected
        resolution_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_support_tickets_mobile ON support_tickets (mobile, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);

      -- NEW: combined-billing queue. When a user pays govt-fee + service-fee
      -- in one payment (e.g. PAN ₹107 + ₹49 service), the govt-fee portion
      -- lands here as 'pending' — it is NOT auto-submitted to the govt
      -- portal (that would mean automating an OTP-protected bank payment).
      -- An admin (logged in themselves, on their own account) actually pays
      -- it on the real govt site and marks it 'remitted' with a reference.
      CREATE TABLE IF NOT EXISTS govt_fee_remittances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile TEXT NOT NULL,
        document_id TEXT NOT NULL,
        razorpay_order_id TEXT NOT NULL,
        govt_fee_paise INT NOT NULL,
        service_fee_paise INT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', -- pending | remitted | refunded
        remitted_reference TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        remitted_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_remittances_status ON govt_fee_remittances (status, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_remittances_mobile ON govt_fee_remittances (mobile, created_at DESC);

      -- Which document (GST, DL, PAN, etc) a payment was for — needed so
      -- ApplyFlow can check "has this user already paid the ₹49 AI-fill fee
      -- for THIS specific document" before unlocking the AI-fill step.
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS document_id TEXT;
    `);
        } catch (err) {
          // "CREATE EXTENSION IF NOT EXISTS" isn't fully race-safe in
          // Postgres even under the advisory lock in rare edge cases —
          // two concurrent runs can both pass the existence check and
          // then collide inserting into pg_extension, raising a duplicate
          // key error (23505) on pg_extension_name_index even though
          // nothing is actually wrong. That specific race is safe to
          // ignore; anything else should still fail loudly, and a real
          // failure clears schemaReady so the next request retries
          // instead of being stuck.
          const isHarmlessExtensionRace =
            err?.code === "23505" && /pg_extension/.test(err?.message || "");
          if (!isHarmlessExtensionRace) {
            schemaReady = null;
            throw err;
          }
        } finally {
          await client.query(`SELECT pg_advisory_unlock(727277001)`).catch(() => {});
        }
      } finally {
        client.release();
      }
    })();
  }
  return schemaReady;
}

async function query(text, params) {
  await ensureSchema();
  return pool.query(text, params);
}

function jobRow(r) {
  return {
    id: r.id,
    title: r.title,
    department: r.department,
    subtitle: r.subtitle,
    lastDate: r.last_date,
    officialUrl: r.official_url,
    color: r.color,
    logo: r.logo,
    fields: r.fields,
    createdAt: r.created_at,
  };
}

function pendingRow(r) {
  return {
    id: r.id,
    title: r.title,
    department: r.department,
    subtitle: r.subtitle,
    lastDate: r.last_date,
    officialUrl: r.official_url,
    color: r.color,
    logo: r.logo,
    fields: r.fields,
    detectedAt: r.detected_at,
  };
}

// ===================== JOBS =====================
// `options.q` = optional search text, `options.limit` caps how many rows
// come back at once (default 200) so a page never has to render 10,000
// rows — the DB does the filtering/sorting, not the browser. `options.offset`
// lets callers page through results (e.g. admin panel) without pulling
// everything into memory.
export async function getJobs(options = {}) {
  const { q = "", limit = 200, offset = 0 } = options;
  const params = [];
  let where = "";
  if (q) {
    // FIX: ab ILIKE trigram-indexed columns (idx_jobs_*_trgm) use karta
    // hai — pehle wala lower(title) LIKE version sirf title par ek plain
    // index tha jo leading '%' ke saath use hi nahi hota tha, aur
    // department/subtitle par koi index tha hi nahi. 1 lakh rows par pehle
    // wala query poori table scan karta; ab teeno column indexed hain.
    params.push(`%${q}%`);
    where = `WHERE title ILIKE $${params.length} OR department ILIKE $${params.length} OR subtitle ILIKE $${params.length}`;
  }
  params.push(limit);
  params.push(offset);
  const res = await query(
    `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return res.rows.map(jobRow);
}

export async function getJobsCount() {
  const res = await query(`SELECT COUNT(*)::int AS count FROM jobs`);
  return res.rows[0].count;
}

// FIX: document/portal service IDs (jaise "aadhaar", "pan-nsdl") text hain,
// jobs table ka `id` column UUID hai. Pehle in dono ko getJobById() mein
// ek hi query se check karte the — jab jobId "aadhaar" jaisa hota, Postgres
// khud "invalid input syntax for type uuid" error de deta (kyunki UUID
// column mein non-UUID text nahi daal sakte), aur yeh raw error seedha
// user ko dikh jaata tha. Ab UUID format check karke hi query chalate hain.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getJobById(id) {
  if (!UUID_RE.test(id)) return null; // document-service id jaisa "aadhaar" — jobs table mein hai hi nahi
  const res = await query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  return res.rows[0] ? jobRow(res.rows[0]) : null;
}

export async function addJob(data) {
  const res = await query(
    `INSERT INTO jobs (title, department, subtitle, last_date, official_url, color, logo, fields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.title,
      data.department || "",
      data.subtitle || "",
      data.lastDate || "",
      data.officialUrl || "",
      data.color || "brandblue",
      data.logo || "govt",
      JSON.stringify(data.fields || []),
    ]
  );
  return jobRow(res.rows[0]);
}

export async function deleteJob(id) {
  await query(`DELETE FROM jobs WHERE id = $1`, [id]);
  return getJobs();
}

// ===================== PENDING JOBS (AI review queue) =====================
export async function getPendingJobs() {
  const res = await query(`SELECT * FROM pending_jobs ORDER BY detected_at DESC LIMIT 500`);
  return res.rows.map(pendingRow);
}

export async function addPendingJob(data) {
  // ON CONFLICT DO NOTHING relies on the unique index on lower(title) —
  // this is the duplicate-proofing, done atomically by the DB instead of
  // a JS loop over every existing row (important once the table is big).
  const res = await query(
    `INSERT INTO pending_jobs (title, department, subtitle, last_date, official_url, color, logo, fields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (lower(title)) DO NOTHING
     RETURNING *`,
    [
      data.title,
      data.department || "",
      data.subtitle || "",
      data.lastDate || "",
      data.officialUrl || "",
      data.color || "brandblue",
      data.logo || "govt",
      JSON.stringify(data.fields || []),
    ]
  );
  return res.rows[0] ? pendingRow(res.rows[0]) : null;
}

export async function approvePendingJob(id, overrides = {}) {
  const res = await query(`SELECT * FROM pending_jobs WHERE id = $1`, [id]);
  const pending = res.rows[0];
  if (!pending) return null;

  const job = await addJob({
    title: overrides.title ?? pending.title,
    department: overrides.department ?? pending.department,
    subtitle: overrides.subtitle ?? pending.subtitle,
    lastDate: overrides.lastDate ?? pending.last_date,
    officialUrl: overrides.officialUrl ?? pending.official_url,
    color: overrides.color ?? pending.color,
    logo: overrides.logo ?? pending.logo,
    fields: overrides.fields ?? pending.fields,
  });

  await query(`DELETE FROM pending_jobs WHERE id = $1`, [id]);
  return job;
}

export async function rejectPendingJob(id) {
  await query(`DELETE FROM pending_jobs WHERE id = $1`, [id]);
  return true;
}

// ===================== USERS =====================
export async function getUsers() {
  const res = await query(`SELECT * FROM users ORDER BY created_at DESC`);
  return res.rows.map((u) => ({
    id: u.id,
    mobile: u.mobile,
    isAdmin: u.is_admin,
    isPremium: u.is_premium,
    premiumUntil: u.premium_until,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    loginCount: u.login_count,
  }));
}

export async function findUserByMobile(mobile) {
  const res = await query(`SELECT * FROM users WHERE mobile = $1`, [mobile]);
  const u = res.rows[0];
  if (!u) return null;
  return {
    id: u.id,
    mobile: u.mobile,
    isAdmin: u.is_admin,
    isPremium: u.is_premium,
    premiumUntil: u.premium_until,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    loginCount: u.login_count,
  };
}

export async function upsertUserLogin(mobile) {
  const adminMobiles = (process.env.ADMIN_MOBILE_NUMBERS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const isAdmin = adminMobiles.includes(mobile);

  const res = await query(
    `INSERT INTO users (mobile, is_admin)
     VALUES ($1, $2)
     ON CONFLICT (mobile) DO UPDATE
       SET last_login_at = now(), login_count = users.login_count + 1, is_admin = $2
     RETURNING *`,
    [mobile, isAdmin]
  );
  const u = res.rows[0];
  return {
    id: u.id,
    mobile: u.mobile,
    isAdmin: u.is_admin,
    isPremium: u.is_premium,
    premiumUntil: u.premium_until,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    loginCount: u.login_count,
  };
}

// ===================== ADS =====================
export async function getAds() {
  const res = await query(`SELECT * FROM ads ORDER BY created_at DESC`);
  return res.rows.map(adRow);
}

export async function getActiveAdsByPlacement(placement) {
  const res = await query(
    `SELECT * FROM ads WHERE placement = $1 AND active = true ORDER BY created_at DESC LIMIT 10`,
    [placement]
  );
  return res.rows.map(adRow);
}

function adRow(a) {
  return {
    id: a.id,
    title: a.title,
    imageUrl: a.image_url,
    targetUrl: a.target_url,
    placement: a.placement,
    active: a.active,
    createdAt: a.created_at,
  };
}

export async function addAd(data) {
  const res = await query(
    `INSERT INTO ads (title, image_url, target_url, placement) VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.title, data.imageUrl || "", data.targetUrl, data.placement || "home-banner"]
  );
  return adRow(res.rows[0]);
}

export async function toggleAd(id) {
  const res = await query(
    `UPDATE ads SET active = NOT active WHERE id = $1 RETURNING *`,
    [id]
  );
  return res.rows[0] ? adRow(res.rows[0]) : null;
}

export async function deleteAd(id) {
  await query(`DELETE FROM ads WHERE id = $1`, [id]);
  return getAds();
}

// ===================== OTP =====================
export async function createOtp(mobile) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await query(
    `INSERT INTO otps (mobile, code, expires_at) VALUES ($1,$2,$3)
     ON CONFLICT (mobile) DO UPDATE SET code = $2, expires_at = $3`,
    [mobile, code, expiresAt]
  );
  return code;
}

export async function verifyOtp(mobile, code) {
  const res = await query(`SELECT * FROM otps WHERE mobile = $1`, [mobile]);
  const entry = res.rows[0];
  if (!entry) return false;
  const ok = entry.code === code && new Date() < new Date(entry.expires_at);
  if (ok) await query(`DELETE FROM otps WHERE mobile = $1`, [mobile]);
  return ok;
}

// ===================== SESSIONS =====================
export async function createSession(mobile) {
  const token =
    Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
  await query(`INSERT INTO sessions (token, mobile) VALUES ($1,$2)`, [token, mobile]);
  return token;
}

export async function getSessionByToken(token) {
  const res = await query(`SELECT * FROM sessions WHERE token = $1`, [token]);
  return res.rows[0] || null;
}

export async function deleteSession(token) {
  await query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

// ===================== SUBSCRIPTIONS (WhatsApp/email job alerts) =====================
export async function upsertSubscription({ mobile, email, whatsappOptIn, emailOptIn }) {
  if (!mobile && !email) throw new Error("mobile ya email mein se ek zaroori hai.");

  if (mobile) {
    const res = await query(
      `INSERT INTO subscriptions (mobile, email, whatsapp_opt_in, email_opt_in)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (mobile) DO UPDATE
         SET email = COALESCE($2, subscriptions.email),
             whatsapp_opt_in = $3,
             email_opt_in = $4
       RETURNING *`,
      [mobile, email || null, Boolean(whatsappOptIn), Boolean(emailOptIn)]
    );
    return res.rows[0];
  }
  const res = await query(
    `INSERT INTO subscriptions (email, email_opt_in)
     VALUES ($1,$2)
     ON CONFLICT (email) DO UPDATE SET email_opt_in = $2
     RETURNING *`,
    [email, Boolean(emailOptIn)]
  );
  return res.rows[0];
}

// Called by the notification worker (lib/queue.js) whenever a job gets
// approved — pulls everyone who opted into at least one channel. Kept
// paginated (limit/offset) so a large subscriber list doesn't get loaded
// into memory in one shot.
export async function getSubscribersPage(limit = 500, offset = 0) {
  const res = await query(
    `SELECT * FROM subscriptions WHERE whatsapp_opt_in = true OR email_opt_in = true
     ORDER BY created_at ASC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
}

export async function getSubscribersCount() {
  const res = await query(
    `SELECT COUNT(*)::int AS count FROM subscriptions WHERE whatsapp_opt_in = true OR email_opt_in = true`
  );
  return res.rows[0].count;
}

// ===================== PAYMENTS (Razorpay) =====================
export async function createPaymentOrder({ mobile, razorpayOrderId, amountPaise, plan, documentId }) {
  const res = await query(
    `INSERT INTO payments (mobile, razorpay_order_id, amount_paise, plan, document_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [mobile, razorpayOrderId, amountPaise, plan || "premium-monthly", documentId || null]
  );
  return res.rows[0];
}

// Has this user already paid the AI-fill fee for this specific document
// (e.g. GST form)? Used to unlock the AI-fill step in ApplyFlow without
// asking them to pay again for the same document.
export async function hasPaidForDocument(mobile, documentId) {
  const res = await query(
    `SELECT 1 FROM payments WHERE mobile = $1 AND document_id = $2 AND status = 'paid' LIMIT 1`,
    [mobile, documentId]
  );
  return res.rows.length > 0;
}

export async function markPaymentPaid({ razorpayOrderId, razorpayPaymentId }) {
  const res = await query(
    `UPDATE payments SET status = 'paid', razorpay_payment_id = $2, paid_at = now()
     WHERE razorpay_order_id = $1 AND status != 'paid' RETURNING *`,
    [razorpayOrderId, razorpayPaymentId]
  );
  const payment = res.rows[0];
  // Already-paid order (e.g. user double-clicked verify) — return existing
  // row without re-crediting anything, so nothing is ever applied twice.
  if (!payment) return getPaymentByOrderId(razorpayOrderId);

  if (payment.plan === "wallet-topup") {
    await creditWallet(payment.mobile, payment.amount_paise, "topup", razorpayPaymentId);
  } else if (payment.plan === "govt-service" || payment.plan === "form-fee") {
    // Nothing extra to activate — for govt-service, the pending row in
    // govt_fee_remittances (created at order time) is what matters now.
    // For form-fee, hasPaidForDocument() reads this payments row directly
    // (status='paid' + document_id match) to unlock the AI-fill step.
  } else {
    // 30-din premium — plan ke hisaab se aage extend kar sakte ho.
    await query(
      `UPDATE users SET is_premium = true, premium_until = now() + interval '30 days'
       WHERE mobile = $1`,
      [payment.mobile]
    );
  }
  return payment;
}

export async function getPaymentByOrderId(razorpayOrderId) {
  const res = await query(`SELECT * FROM payments WHERE razorpay_order_id = $1`, [razorpayOrderId]);
  return res.rows[0] || null;
}

// Recent payments for a user — used by the stuck-payment resolver to find
// what the user is likely talking about when they don't give an order id.
// Activates premium directly, without a Razorpay order — used when premium
// is paid for out of the in-app wallet instead of a fresh checkout.
export async function activatePremiumForMobile(mobile, days = 30) {
  await query(
    `UPDATE users SET is_premium = true, premium_until = now() + ($2 || ' days')::interval WHERE mobile = $1`,
    [mobile, String(days)]
  );
}

export async function getRecentPaymentsByMobile(mobile, limit = 5) {
  const res = await query(
    `SELECT * FROM payments WHERE mobile = $1 ORDER BY created_at DESC LIMIT $2`,
    [mobile, limit]
  );
  return res.rows;
}

// ===================== WALLET =====================
// IMPORTANT: wallet ko sirf REAL payment methods (UPI/card/netbanking via
// Razorpay) se hi credit kiya ja sakta hai — kisi bhi identity document
// (PAN/DL/passport) se paisa credit karna is design mein possible hi nahi
// hai, aur hona bhi nahi chahiye. Wo documents sirf KYC/autofill data ke
// roop mein `documents` table/feature mein rehte hain, payment se unka
// koi lena dena nahi.
export async function getWalletBalance(mobile) {
  const res = await query(`SELECT wallet_balance_paise FROM users WHERE mobile = $1`, [mobile]);
  return res.rows[0]?.wallet_balance_paise ?? 0;
}

// Single transaction: balance update + ledger row together, so the ledger
// can never drift out of sync with the actual balance.
async function adjustWallet(mobile, deltaPaise, reason, razorpayPaymentId = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userRes = await client.query(
      `SELECT wallet_balance_paise FROM users WHERE mobile = $1 FOR UPDATE`,
      [mobile]
    );
    if (!userRes.rows[0]) throw new Error("User nahi mila.");
    const current = userRes.rows[0].wallet_balance_paise;
    const next = current + deltaPaise;
    if (next < 0) throw new Error("Wallet mein itna balance nahi hai.");

    await client.query(`UPDATE users SET wallet_balance_paise = $2 WHERE mobile = $1`, [mobile, next]);
    const ledgerRes = await client.query(
      `INSERT INTO wallet_ledger (mobile, amount_paise, balance_after_paise, reason, razorpay_payment_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [mobile, deltaPaise, next, reason, razorpayPaymentId]
    );
    await client.query("COMMIT");
    return { balance: next, entry: ledgerRes.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function creditWallet(mobile, amountPaise, reason, razorpayPaymentId = null) {
  if (amountPaise <= 0) throw new Error("Credit amount positive hona chahiye.");
  return adjustWallet(mobile, amountPaise, reason, razorpayPaymentId);
}

export async function debitWallet(mobile, amountPaise, reason) {
  if (amountPaise <= 0) throw new Error("Debit amount positive hona chahiye.");
  return adjustWallet(mobile, -amountPaise, reason);
}

export async function getWalletLedger(mobile, limit = 50) {
  const res = await query(
    `SELECT * FROM wallet_ledger WHERE mobile = $1 ORDER BY created_at DESC LIMIT $2`,
    [mobile, limit]
  );
  return res.rows;
}

// ===================== SUPPORT TICKETS (stuck payment resolver) =====================
export async function createSupportTicket({ mobile, razorpayOrderId, issue }) {
  const res = await query(
    `INSERT INTO support_tickets (mobile, razorpay_order_id, issue) VALUES ($1,$2,$3) RETURNING *`,
    [mobile, razorpayOrderId || null, issue]
  );
  return res.rows[0];
}

export async function resolveSupportTicket(id, status, resolutionNote) {
  const res = await query(
    `UPDATE support_tickets SET status = $2, resolution_note = $3, resolved_at = now() WHERE id = $1 RETURNING *`,
    [id, status, resolutionNote || null]
  );
  return res.rows[0];
}

export async function getOpenSupportTickets(limit = 100) {
  const res = await query(
    `SELECT * FROM support_tickets WHERE status IN ('open','needs-admin') ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

// ===================== GOVT FEE REMITTANCES (combined billing) =====================
export async function createRemittance({ mobile, documentId, razorpayOrderId, govtFeePaise, serviceFeePaise }) {
  const res = await query(
    `INSERT INTO govt_fee_remittances (mobile, document_id, razorpay_order_id, govt_fee_paise, service_fee_paise)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [mobile, documentId, razorpayOrderId, govtFeePaise, serviceFeePaise]
  );
  return res.rows[0];
}

export async function getPendingRemittances(limit = 100) {
  const res = await query(
    `SELECT * FROM govt_fee_remittances WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function markRemittanceDone(id, remittedReference) {
  const res = await query(
    `UPDATE govt_fee_remittances SET status = 'remitted', remitted_reference = $2, remitted_at = now()
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, remittedReference || null]
  );
  return res.rows[0] || null;
}

export async function getRemittancesByMobile(mobile, limit = 20) {
  const res = await query(
    `SELECT * FROM govt_fee_remittances WHERE mobile = $1 ORDER BY created_at DESC LIMIT $2`,
    [mobile, limit]
  );
  return res.rows;
}

// ===================== SAVED PASSENGERS (autofill reuse) =====================
export async function getSavedPassengers(userMobile) {
  const res = await query(
    `SELECT * FROM saved_passengers WHERE user_mobile = $1 ORDER BY created_at DESC`,
    [userMobile]
  );
  return res.rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    age: r.age,
    gender: r.gender,
    berthPreference: r.berth_preference,
    createdAt: r.created_at,
  }));
}

export async function addSavedPassenger(userMobile, { fullName, age, gender, berthPreference }) {
  if (!fullName || !fullName.trim()) throw new Error("Naam zaroori hai.");
  const res = await query(
    `INSERT INTO saved_passengers (user_mobile, full_name, age, gender, berth_preference)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userMobile, fullName.trim(), age || "", gender || "", berthPreference || ""]
  );
  const r = res.rows[0];
  return { id: r.id, fullName: r.full_name, age: r.age, gender: r.gender, berthPreference: r.berth_preference };
}

export async function deleteSavedPassenger(userMobile, id) {
  await query(`DELETE FROM saved_passengers WHERE id = $1 AND user_mobile = $2`, [id, userMobile]);
}
