# Setup — pehle yeh padho

## Kya missing tha aur maine kya banaya
Aapke zip mein UI (components, pages) already tha, lekin poora backend
(`lib/` folder) hi nahi tha — isliye site chalti hi nahi. Maine banaya:

- `lib/db.js` — **real Postgres database** (jobs, users, ads, OTP, sessions),
  indexes ke saath — 10,000+ jobs par bhi fast rahega
- `lib/auth.js` + saara `app/api/auth/*` — mobile OTP login system
- `lib/gemini.js` — Google Gemini AI se live internet search karke naye
  sarkari jobs dhoondta hai
- `app/api/cron/scan-jobs` — yehi wo "24 ghanta internet dekho" wala part hai
- `app/layout.js`, `data/documents.js`, `lib/formFillSession.js`,
  `app/api/jobs` (homepage ke liye) — aur kuch chhoti missing files
- `package.json`, `next.config.js`, `postcss.config.js`

## Database: kyun Postgres, aur 10,000 jobs pe kya farak padta hai
Pehle file-based JSON tha — har save par pura file dobara likhta tha, aur
10,000 jobs pe woh ek hi bada JSON blob ban jaata (slow, corrupt hone ka
risk, aur Vercel jaisi serverless jagah pe toh file save hoti hi nahi
persist). Ab:
- Har job ek alag database row hai — add/delete/search sab **indexed**
  hain, poori list JS mein load nahi hoti
- Duplicate job title check database khud atomically karta hai
  (`ON CONFLICT`) — 10,000 rows pe loop nahi chalta
- Jobs listing page aur homepage sirf zaroori jitna data maangte hain
  (latest 60-200), na ki sab 10,000 ek saath

## 1. Install aur local run
```
npm install
cp .env.example .env
```
`.env` mein fill karo:
- `DATABASE_URL` — free Postgres 2 minute mein: https://neon.tech par
  account banao → naya project → "Connection string" copy karo, yahan paste
  karo. (Supabase/Vercel Postgres/Railway bhi chalega, connection string
  wahi format hona chahiye.) Tables khud-ba-khud ban jaayenge, first request
  par — kuch manually run nahi karna.
- `ADMIN_MOBILE_NUMBERS` — apna mobile number (jisse admin panel khulega)
- `GEMINI_API_KEY` — free key: https://aistudio.google.com/apikey
- `CRON_SECRET` — koi bhi lamba random string bana lo

```
npm run dev
```
`http://localhost:3000` khol ke apne mobile se login karo (OTP screen pe
hi dikh jayega, kyunki abhi real SMS jud nahi hai) — phir `/admin` par jao.

## 2. "24x7 internet dekho" wala real automation
Main khud background mein nahi chal sakta — lekin yeh system har 30 minute
mein khud-ba-khud internet scan karega, bina aapko touch kiye:

**Option A — GitHub Actions (recommended, secret safe rehta hai):**
1. Is code ko GitHub repo mein push karo
2. Repo → Settings → Secrets → naye secrets add karo:
   - `SITE_URL` = aapki live site ka URL
   - `CRON_SECRET` = wahi jo `.env` mein daala
3. `.github/workflows/auto-scan-jobs.yml` already ready hai — har 30 min
   mein khud scan karega.

**Option B — Vercel Cron:**
`vercel.json` mein already schedule set hai — bas `CRON_SECRET_PLACEHOLDER`
ko apne real secret se replace karo Vercel pe deploy karne se pehle.

## 3. Naye jobs kaise publish hote hain
Scan se mile jobs seedha live site pe NAHI jaate — pehle "AI Review Queue"
(admin panel) mein aate hain. Aapko ek click "Approve" karna hoga. Aisa
isliye rakha hai kyunki AI kabhi galat last-date ya galat link bhi de sakta
hai — sarkari job site par galat info bahut nuksaan kar sakti hai. Agar
aap chahte ho ki bina check kiye seedha publish ho jaaye, bata dena — but
mai recommend karunga ki approval step rakho.

## 4. Deploy
Vercel par sabse aasan hai: `vercel.json` mein cron already hai. Bas Vercel
project settings mein wahi `.env` wale environment variables add kar dena
(`DATABASE_URL`, `ADMIN_MOBILE_NUMBERS`, `GEMINI_API_KEY`, `CRON_SECRET`).
Neon/Supabase/Vercel Postgres — sab Vercel serverless ke saath fine kaam
karte hain kyunki data database mein hai, function ke local disk pe nahi.

## 5. WhatsApp/Email job alerts (naya)
Do cheezein chahiye:

1. **Redis** — free tier ke liye https://upstash.com par jao, ek Redis
   database bana lo, `REDIS_URL` `.env` mein daal do.
2. **Notification worker chalao** — yeh Vercel par nahi chal sakta
   (serverless functions long-running nahi ho sakte), isse alag jagah
   chalana hoga:
   ```
   npm run worker
   ```
   Isko wahi jagah chalao jahan `remote-browser-server` bhi chal raha hai
   (Railway/Render/apna VM) — dono ko 24x7 chalna hai.
3. **WhatsApp** — https://developers.facebook.com/docs/whatsapp par
   Business account banao, ek message template approve karwao (naam
   `new_job_alert`, ek body variable), `WHATSAPP_TOKEN` aur
   `WHATSAPP_PHONE_NUMBER_ID` `.env` mein daalo.
4. **Email** — https://resend.com par free account, `RESEND_API_KEY` daalo.

Dono optional hain — jo bhi configure nahi hoga, wo channel chup-chaap
skip ho jayega (crash nahi hoga).

## 6. Payment (Premium — naya)
https://dashboard.razorpay.com par account banao, KYC complete karo (bina
KYC ke live payments nahi lenge, sirf test mode chalega), `RAZORPAY_KEY_ID`
aur `RAZORPAY_KEY_SECRET` `.env` mein daalo. Abhi ek hi plan hai
(`premium-monthly`, ₹49) — `app/api/payments/create-order/route.js` ke
`PLANS` object mein aur plans add kar sakte ho.

## 7. Architecture — `data/` folder vs `lib/db.js`
Confusion se bachne ke liye: `/data/states.js` aur `/data/documents.js`
**jaanbujh kar static** hain (states ki list, document-types ki list —
ye cheezein baar-baar nahi badalti, DB mein rakhna overkill hoga). Baaki
**sab kuch** (jobs, pending jobs, users, ads, subscriptions, payments)
`lib/db.js` ke through Postgres se aata hai aur admin panel se manage
hota hai — koi bhi static seed file nahi hai jo overwrite ho.

## 8. Wallet + stuck-payment resolver (NEW)

**Wallet**: `/api/payments/create-order` ab `plan: "wallet-topup"` bhi accept
karta hai (₹100/200/500/1000 fixed amounts, `walletTopupPaise` ke saath).
User Razorpay se real payment karta hai (UPI/card/netbanking — **kabhi bhi
PAN/DL/Passport se nahi**, wo sirf identity documents hain, payment
instrument nahi). Verify hone par `lib/db.js` ka `creditWallet()` balance
add karta hai. Phir `/api/wallet/spend` se wahi balance instantly premium
jaise services par kharch ho sakta hai — is se user ek baar topup karke
baar baar checkout khole bina services le sakta hai. Poora ledger
(`wallet_ledger` table) audit ke liye save hota hai.

**Stuck payment resolver** (`/api/payments/resolve-stuck`): AI chat
(`/api/gemini`) mein jab koi user "paisa fas gaya"/"payment stuck"/"refund"
jaisa likhta hai, ye deterministically (keyword match — AI model khud kabhi
paisa move nahi karta) is API ko call karta hai. Ye Razorpay se seedha
poochta hai ki payment actually capture hua tha ya nahi:
- Agar Razorpay capture confirm karta hai but humare system ne credit/premium
  activate nahi kiya tha (e.g. verify call beech mein fail ho gaya) → auto-fix
  ho jaata hai.
- Agar Razorpay ke paas capture record hi nahi hai → koi credit nahi hota,
  user ko clearly bataya jaata hai ki paisa cut hi nahi hua tha.
- Kisi bhi doubt wale case mein `support_tickets` table mein ticket ban
  jaata hai admin review ke liye — kabhi blind refund nahi hota.

Ye kabhi kisi government portal ya third-party gateway ka paisa nahi
chhoo sakta — sirf apne Razorpay account tak simit hai.

## 9. Combined billing for govt services (PAN/DL/Passport) (NEW)

`data/documents.js` mein PAN card entry par `govtFeePaise` (10700 = ₹107)
aur `serviceFeePaise` (4900 = ₹49) set hai. Jab dono set hon, document page
par ek combined checkout dikhta hai — user ek hi payment mein ₹156 pay
karta hai (bill breakdown ke saath), do baar alag se pay nahi karna padta.

**Important — govt-fee wala hissa automate NAHI hota.** NSDL/UTIITSL jaisi
government sites par payment ke waqt bank OTP live us insaan ke phone par
aata hai jiska card hai — koi AI/bot wo OTP khud approve nahi kar sakta,
aur CAPTCHA/OTP bypass karne wala automation banana government portal ke
anti-fraud protections todna hota hai. Isliye:

1. User ka combined payment turant capture hota hai (Razorpay se).
2. Govt-fee wala portion `govt_fee_remittances` table mein "pending" ban
   jaata hai.
3. Admin Panel → "Govt Fee Remittances" tab mein saare pending amounts
   dikhte hain. Tum (ya jo bhi authorized ho) khud NSDL/UTIITSL/Parivahan
   par apne login se jaake actual fee pay karo, phir wahan se mile
   receipt/acknowledgement number ke saath "Remitted mark karo" click karo.

Agar tumhare paas NSDL/UTIITSL ka official PAN Service Agent (PSA)
registration ho jaaye, to yahan ek proper bulk-payment API integration bhi
add ki ja sakti hai jo ye step bhi automate kar de — legally aur
technically, kyunki wo unka official B2B channel hota hai, koi CAPTCHA/OTP
bypass nahi. Abhi ke liye manual admin-remit wala flow hi safe hai.

Passport aur Driving Licence entries mein `govtFeePaise` jaanbujh kar set
nahi hai — inki fees state/type ke hisaab se badalti hain, real current fee
daal ke hi combined billing on karo unke liye.

## 10. Load testing (500-1000 concurrent users)
Isse main guess nahi kar sakta — real number sirf actual load test se
milega. `remote-browser-server` mein ek `MAX_CONCURRENT_SESSIONS` cap
(default 40) laga di hai taaki traffic spike पर pura server crash na ho,
extra requests ko clean 503 milega. Real capacity janne ke liye k6 ya
Artillery jaisa tool se load test chalao staging environment par, deploy
se pehle.
