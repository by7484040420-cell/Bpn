import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { chatReply } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

// Keyword-based intent check for "my payment is stuck" messages, in Hindi,
// Hinglish, and English. Deliberately NOT left to the LLM to decide — money
// actions must go through the deterministic, Razorpay-verified resolver in
// /api/payments/resolve-stuck, never through an AI model deciding on its own
// that a refund/credit is warranted.
const STUCK_PAYMENT_PATTERNS = [
  /paisa\s*(fas|phas|atak|stuck)/i,
  /payment\s*(fas|phas|stuck|fail|atak)/i,
  /paise?\s*kat(a|e)?\s*gaye?/i, // "paisa kat gaya"
  /refund/i,
  /money\s*stuck/i,
  /paisa\s*wapas/i,
];

function looksLikeStuckPayment(text) {
  return STUCK_PAYMENT_PATTERNS.some((re) => re.test(text));
}

export async function POST(req) {
  const { message, history = [] } = await req.json().catch(() => ({}));
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message khaali hai." }, { status: 400 });
  }

  const rl = await checkRateLimit(`chat:${req.headers.get("x-forwarded-for") || "anon"}`, 30, 300);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Bahut zyada messages. Thoda ruk ke try karo." }, { status: 429 });
  }

  // Stuck-payment messages get routed to the verified resolver instead of
  // the general chat model — this is the one path in the app allowed to
  // touch money, and it never trusts free-form chat text to do so.
  if (looksLikeStuckPayment(message)) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({
        reply:
          "Payment se related help ke liye pehle login karo — mobile number se OTP verify karke, taaki main sirf tumhare hi account ka payment check karu.",
      });
    }

    try {
      const resolveRes = await fetch(new URL("/api/payments/resolve-stuck", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({ note: message }),
      });
      const data = await resolveRes.json();
      return NextResponse.json({ reply: data.message || "Check kar liya, lekin clear jawab nahi mila. Admin se contact karo." });
    } catch (err) {
      return NextResponse.json({
        reply: "Payment check karte waqt dikkat aa gayi. Thodi der baad try karo ya admin se contact karo.",
      });
    }
  }

  try {
    const reply = await chatReply(message, [...history, { role: "user", text: message }]);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Gemini chat error:", err);
    return NextResponse.json({ error: "Abhi AI se connect nahi ho paya." }, { status: 502 });
  }
}
