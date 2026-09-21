// Popular Indian government document/service portals.
// `fields` lists what the AI form-fill step (ApplyFlow + RemoteBrowserViewer)
// can help with — always just the non-sensitive profile fields. OTP,
// captcha, biometrics, and payment are NEVER in this list: those steps
// always stay in the user's own hands (see formFillSession.js).
//
// `officialUrl` = real government site, opened either directly, or via the
// AI-assisted live browser for the fields listed here.
//
// PRICING RULE (applies to every entry the same way, via getServiceFeePaise()
// below — don't hardcode a fee per entry):
//   - `isDownloadOnly: true`           → our AI-fill service is FREE
//   - `formPageCount` 1 (or unset)     → FREE (simple single-page form)
//   - `formPageCount` 2+               → ₹49 service charge (multi-page form,
//                                         more AI work to fill it correctly)
// Chat (Bipin AI) is always free regardless of this — that's a separate
// thing from the per-document form-fill charge.
//
// `govtFeePaise` (optional, separate from the above): a REAL government fee
// that this service charges on its own portal (e.g. PAN e-KYC = ₹107). When
// set, it's combined into one payment with the ₹49 service fee (if any) —
// see /api/payments/create-order, plan "govt-service". The govt-fee portion
// is NOT auto-submitted to the government site by a bot — that would mean
// automating an OTP-protected bank payment, which we don't do (see
// formFillSession.js / documents/[id]/page.js warning). Instead it's queued
// in `govt_fee_remittances` and an admin actually pays it on the real portal
// and marks it remitted — see app/api/admin/remittances/route.js.
// VERIFY ALL govtFeePaise AMOUNTS before going live — government fees
// change, and several entries below deliberately leave it unset because the
// real fee varies by state/type (see notes on those entries).
export const documentServices = [
  {
    id: "aadhaar",
    title: "Aadhaar Card",
    subtitle: "Update / e-Aadhaar Download",
    department: "UIDAI",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "address", "mobile"],
    uploadFields: ["addressProof"],
    officialUrl: "https://uidai.gov.in",
    formPageCount: 1,
  },
  {
    id: "pan",
    title: "PAN Card",
    subtitle: "New PAN / e-PAN Download",
    department: "Income Tax Dept / Protean (NSDL)",
    lastDate: "Anytime",
    color: "brandgreen",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile", "email"],
    uploadFields: ["photo", "signature", "idProof"],
    officialUrl: "https://www.onlineservices.nsdl.com",
    formPageCount: 2, // multi-section NSDL form → ₹49 service fee applies
    // ₹107 = current NSDL e-PAN fee (Indian communication address) as told
    // by site owner — RE-VERIFY on nsdl.com before launch, this changes.
    govtFeePaise: 10700,
  },
  {
    id: "irctc",
    title: "IRCTC",
    subtitle: "Ticket Booking / Account",
    department: "Indian Railway Catering & Tourism Corp.",
    lastDate: "Anytime",
    color: "brandred",
    logo: "railway",
    // age/gender/berthPreference yahan isliye hain kyunki Tatkal/normal
    // ticket booking mein passenger ki yehi details bharni padti hain —
    // saved passenger select karne par ye sab ek saath fill ho jaate hain.
    fields: ["fullName", "age", "gender", "berthPreference", "dob", "address", "mobile", "email"],
    officialUrl: "https://www.irctc.co.in",
    formPageCount: 2, // passenger details + payment step
  },
  {
    id: "voter-id",
    title: "Voter ID",
    subtitle: "New / Correction (EPIC)",
    department: "Election Commission of India",
    lastDate: "Anytime",
    color: "brandpurple",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://voters.eci.gov.in",
    formPageCount: 1,
  },
  {
    id: "passport",
    title: "Passport",
    subtitle: "New / Renewal",
    department: "Ministry of External Affairs",
    lastDate: "Anytime",
    color: "saffron",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile", "email"],
    officialUrl: "https://www.passportindia.gov.in",
    formPageCount: 2, // multi-section application
    // No govtFeePaise set — passport fee varies a lot (normal/Tatkal,
    // 36/60-page booklet, fresh/renewal). Add it once you know which
    // variant this listing is for, to enable combined billing.
  },
  {
    id: "driving-licence",
    title: "Driving Licence",
    subtitle: "New / Renewal",
    department: "Ministry of Road Transport (Parivahan)",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://parivahan.gov.in",
    formPageCount: 2, // learner's + permanent licence sections
    // No govtFeePaise set — DL fee varies by state RTO. Add it per-state
    // (or split this into per-state listings) to enable combined billing.
  },
  {
    id: "ration-card",
    title: "Ration Card",
    subtitle: "New / Correction",
    department: "National Food Security (NFSA)",
    lastDate: "Anytime",
    color: "brandgreen",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://nfsa.gov.in",
    formPageCount: 2, // family member details + address verification sections
  },
  {
    id: "income-certificate",
    title: "Income Certificate",
    subtitle: "Apply Online",
    department: "Digital India / State e-District",
    lastDate: "Anytime",
    color: "brandpurple",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://digitalindia.gov.in",
    formPageCount: 1,
  },
  {
    id: "caste-certificate",
    title: "Caste Certificate",
    subtitle: "Apply Online",
    department: "Digital India / State e-District",
    lastDate: "Anytime",
    color: "saffron",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "category", "mobile"],
    officialUrl: "https://digitalindia.gov.in",
    formPageCount: 1,
  },
  {
    id: "residence-certificate",
    title: "Residence Certificate",
    subtitle: "Niwas Praman Patra — Apply Online",
    department: "Digital India / State e-District",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://digitalindia.gov.in",
    formPageCount: 1,
  },
  {
    id: "birth-certificate",
    title: "Birth Certificate",
    subtitle: "Apply / Download",
    department: "Registrar General of India (CRS)",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "fatherName", "address", "mobile"],
    officialUrl: "https://crsorgi.gov.in",
    formPageCount: 1,
  },
  {
    id: "pf",
    title: "EPF / UAN",
    subtitle: "Balance / KYC / Withdrawal",
    department: "Employees' Provident Fund Organisation",
    lastDate: "Anytime",
    color: "brandgreen",
    logo: "govt",
    fields: ["fullName", "dob", "mobile", "email"],
    officialUrl: "https://unifiedportal-mem.epfindia.gov.in",
    isDownloadOnly: true, // balance check / passbook — not a form submission
  },
  {
    id: "gst",
    title: "GST Registration",
    subtitle: "New Registration / e-Way Bill",
    department: "Goods and Services Tax Network",
    lastDate: "Anytime",
    color: "brandpurple",
    logo: "govt",
    fields: ["fullName", "mobile", "email", "address"],
    officialUrl: "https://www.gst.gov.in",
    formPageCount: 2, // business + promoter + place-of-business sections
  },
  {
    id: "income-tax",
    title: "Income Tax e-Filing",
    subtitle: "ITR / Refund Status / PAN-Aadhaar Link",
    department: "Income Tax Department",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "mobile", "email"],
    officialUrl: "https://eportal.incometax.gov.in",
    formPageCount: 2, // ITR filing has multiple sections
  },
  {
    id: "ncs",
    title: "National Career Service",
    subtitle: "Jobs, Career Counselling, Training",
    department: "Ministry of Labour & Employment",
    lastDate: "Anytime",
    color: "saffron",
    logo: "govt",
    fields: ["fullName", "dob", "mobile", "email", "qualification"],
    officialUrl: "https://www.ncs.gov.in",
    formPageCount: 1,
  },
  {
    id: "umang",
    title: "UMANG",
    subtitle: "Central + State Govt Services, Ek Jagah",
    department: "Ministry of Electronics & IT",
    lastDate: "Anytime",
    color: "brandgreen",
    logo: "govt",
    fields: ["fullName", "mobile"],
    officialUrl: "https://web.umang.gov.in",
    isDownloadOnly: true, // just a portal directory, no form here
  },
  {
    id: "digilocker",
    title: "DigiLocker",
    subtitle: "Documents Store & Verify",
    department: "Ministry of Electronics & IT",
    lastDate: "Anytime",
    color: "brandblue",
    logo: "govt",
    fields: ["fullName", "dob", "mobile"],
    officialUrl: "https://www.digilocker.gov.in",
    isDownloadOnly: true, // document retrieval, not a form submission
  },
];

export function getDocumentById(id) {
  return documentServices.find((d) => d.id === id);
}

// Single source of truth for what our AI-fill service costs — see the
// PRICING RULE comment above. Never hardcode ₹49 anywhere else; always call
// this, so the rule changes in exactly one place.
export function getServiceFeePaise(doc) {
  if (!doc || doc.isDownloadOnly) return 0;
  return (doc.formPageCount || 1) >= 2 ? 4900 : 0;
}
