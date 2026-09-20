package com.bipinai.chat

/**
 * Ek service = ek government portal.
 * URLs verified (Sep 2026) — lekin govt sites apna URL/structure kabhi bhi
 * badal sakte hai, to production mein deploy se pehle dubara check karo.
 *
 * fieldMap: form field ke "purpose" ko us field ke actual HTML selector se
 * jodta hai (id, name, ya CSS selector). Yeh selectors PLACEHOLDER hai —
 * har real site ka HTML alag hota hai aur badalta rehta hai, isliye
 * Chrome DevTools (desktop) ya "Inspect" se har field ka asli id/name
 * nikaal ke yahan daalo, tabhi auto-fill kaam karega. Bina verify kiye
 * production mein mat chalao.
 */
enum class GovtService(
    val displayName: String,
    val icon: String,
    val url: String,
    val note: String,
    val fieldMap: Map<String, String> = emptyMap()
) {
    PAN_CARD(
        displayName = "PAN Card",
        icon = "🪪",
        url = "https://www.incometax.gov.in/iec/foportal/",
        note = "Aadhaar-based instant e-PAN. Mobile/Aadhaar AI bhar dega, CAPTCHA aur OTP aapko dalna hoga.",
        fieldMap = mapOf(
            "aadhaar" to "#aadhaarNumber",   // VERIFY: placeholder selector
            "mobile" to "#mobileNumber"      // VERIFY: placeholder selector
        )
    ),
    INCOME_TAX(
        displayName = "Income Tax",
        icon = "👤",
        url = "https://www.incometax.gov.in/iec/foportal/",
        note = "Login PAN + password/OTP se hota hai. Return filing multi-step wizard hai."
    ),
    AADHAAR(
        displayName = "Aadhaar",
        icon = "🆔",
        url = "https://myaadhaar.uidai.gov.in/",
        note = "Har action (address update, download) Aadhaar number + OTP maangta hai."
    ),
    DRIVING_LICENSE(
        displayName = "Driving License",
        icon = "🚗",
        url = "https://sarathi.parivahan.gov.in/sarathiservice/",
        note = "State-specific hai — user pehle apna state dropdown se chunta hai, phir hi form aata hai."
    ),
    RATION_CARD(
        displayName = "Ration Card",
        icon = "📋",
        url = "https://nfsa.gov.in/",
        note = "Ration card fully state government ke through issue hota hai — NFSA sirf directory/status hai; asli apply link user ke state ke food-supply portal pe le jaata hai."
    ),
    SCHOLARSHIP(
        displayName = "Scholarship",
        icon = "🎓",
        url = "https://scholarships.gov.in/",
        note = "One Time Registration (OTR) ke baad hi scheme-specific form khulta hai."
    );
}
