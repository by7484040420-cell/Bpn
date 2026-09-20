package com.bipinai.chat

/**
 * Ek service = ek government portal.
 * URLs verified (Sep 2026) — lekin govt sites apna URL/structure kabhi bhi
 * badal sakte hai, to production mein deploy se pehle dubara check karo.
 *
 * fieldMap: form field ke "purpose" ko us field ke actual HTML selector se
 * jodta hai (id, name, ya CSS selector). Yeh selectors PLACEHOLDER hai —
 * Chrome DevTools se har field ka asli id/name nikaal ke yahan daalo,
 * tabhi auto-fill kaam karega. Bina verify kiye production mein mat chalao.
 */
enum class GovtService(
    val displayName: String,
    val shortName: String,
    val icon: String,
    val url: String,
    val note: String,
    val fieldMap: Map<String, String> = emptyMap()
) {
    PAN_CARD(
        displayName = "PAN Card (Instant e-PAN)",
        shortName = "PAN Card",
        icon = "💳",
        url = "https://www.incometax.gov.in/iec/foportal/",
        note = "Aadhaar-based instant e-PAN. OTP verification zaroori hai — auto-fill nahi ho sakta.",
        fieldMap = mapOf(
            "aadhaar" to "#aadhaarNumber",   // VERIFY: placeholder selector
            "mobile" to "#mobileNumber"      // VERIFY: placeholder selector
        )
    ),
    INCOME_TAX(
        displayName = "Income Tax e-Filing",
        shortName = "Income Tax",
        icon = "👤",
        url = "https://www.incometax.gov.in/iec/foportal/",
        note = "Login PAN + password/OTP se hota hai. Return filing multi-step wizard hai."
    ),
    AADHAAR(
        displayName = "Aadhaar (Update / Download)",
        shortName = "Aadhaar",
        icon = "🆔",
        url = "https://myaadhaar.uidai.gov.in/",
        note = "Har action (address update, download) Aadhaar number + OTP maangta hai."
    ),
    DRIVING_LICENSE(
        displayName = "Driving License (Sarathi)",
        shortName = "Driving License",
        icon = "🚗",
        url = "https://sarathi.parivahan.gov.in/sarathiservice/",
        note = "State-specific hai — user pehle apna state dropdown se chunta hai, phir hi form aata hai."
    ),
    RATION_CARD(
        displayName = "Ration Card (NFSA)",
        shortName = "Ration Card",
        icon = "📋",
        url = "https://nfsa.gov.in/",
        note = "Ration card fully state government ke through issue hota hai — NFSA sirf directory/status hai; asli apply link user ke state ke food-supply portal pe le jaata hai."
    ),
    SCHOLARSHIP(
        displayName = "Scholarship (NSP)",
        shortName = "Scholarship",
        icon = "🎓",
        url = "https://scholarships.gov.in/",
        note = "One Time Registration (OTR) ke baad hi scheme-specific form khulta hai."
    );

    /** AI reply bubble for this service, with an "Open ..." button. */
    fun toChatMessage(): ChatMessage = ChatMessage(
        text = "$displayName\n\n$note\n\nNeeche button se official portal khol lo.",
        isFromUser = false,
        service = this
    )

    companion object {
        /**
         * Simple keyword matching so the demo works without a backend.
         * Replace with your bot/LLM call later.
         */
        fun match(text: String): GovtService? {
            val t = text.lowercase()
            val words = t.split(Regex("\\W+"))
            return when {
                "pan" in words -> PAN_CARD
                "income tax" in t || "incometax" in t || "itr" in words -> INCOME_TAX
                "license" in t || "licence" in t || "driving" in t || "dl" in words -> DRIVING_LICENSE
                "ration" in t -> RATION_CARD
                "scholarship" in t -> SCHOLARSHIP
                "aadhaar" in t || "aadhar" in t || "adhar" in t -> AADHAAR
                else -> null
            }
        }

        fun helpText(): String =
            "Main in sarkari services mein madad kar sakta hoon: PAN Card, Income Tax, " +
                "Aadhaar, Driving License, Ration Card, Scholarship.\n\n" +
                "Inme se kisi ka naam likhiye (jaise \"Mujhe PAN card banana hai\") ya service chuniye."
    }
}
