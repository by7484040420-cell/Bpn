// FIX: pehle raw fetch() se Gemini REST API call ho raha tha — kaam to
// karta tha, par error-handling/retry/typing ka fayda nahi milta tha.
// Ab official @google/generative-ai SDK use kar rahe hain (package.json
// mein add ho chuka hai). Behaviour same hai, sirf implementation cleaner.
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.0-flash";

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY set nahi hai — .env mein add karo.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    // Google Search grounding — model ko current results dikhte hain,
    // sirf training data pe nahi rehta.
    tools: [{ googleSearch: {} }],
  });
}

// General chat reply for the "Bipin AI" assistant widget. `history` is the
// prior messages ({role, text}[]) so the model has conversation context.
// Kept deliberately simple (no tool-calling) — the stuck-payment flow is
// handled deterministically BEFORE this is called (see app/api/gemini/route.js)
// so the model is never in a position to promise a refund/credit itself.
export async function chatReply(message, history = []) {
  const model = getModel();

  const chatHistory = history
    .slice(0, -1) // last item is the current `message` itself, already sent separately
    .filter((m) => m.text)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

  const systemPreamble = `Tum "Bipin AI" ho — Sarkari AI website ka helpful assistant. Indian
government jobs, admit cards, results, aur document/form-fill related sawaalon
mein madad karo. Hinglish mein, friendly aur seedha jawab do. Agar tumhe pakka
pata nahi hai to guess mat karo, keh do ki official website check karo.`;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPreamble }] },
      { role: "model", parts: [{ text: "Samajh gaya, main is tarah madad karunga." }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessage(message);
  return result?.response?.text?.() || "Maaf karo, abhi jawab nahi de paaya.";
}

function extractJson(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function scanForNewJobs(existingTitles = []) {
  const model = getModel();

  const prompt = `Tum ek Indian "sarkari naukri" (government job) tracking assistant ho.
Google Search se abhi ke (last 7 din ke) naye sarkari job notifications dhoondo —
jaise SSC, UPSC, Railway (RRB), Banking (IBPS/SBI), state PSC, police recruitment,
defence (Army/Navy/Air Force), teaching (CTET/state TET) etc.

In titles ko IGNORE karo, ye already hamare system mein hain:
${existingTitles.length ? existingTitles.join(", ") : "(koi nahi)"}

Sirf naye, abhi tak list na hue notifications do. Har ek ke liye sirf wahi info do
jo tumhe official/reliable source par mili ho — kabhi guess mat karo, khali chhod do.

STRICT: sirf neeche jaisa JSON array return karo, koi aur text, markdown, ya
code fence nahi:
[
  {
    "title": "SSC CGL 2026",
    "department": "Staff Selection Commission",
    "subtitle": "Combined Graduate Level Examination",
    "lastDate": "04 Sep 2026",
    "officialUrl": "https://ssc.gov.in"
  }
]

Agar kuch naya nahi mila to khali array [] return karo.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    throw new Error(`Gemini API error: ${err.message || err}`);
  }

  const text = result?.response?.text?.() || "";
  const parsed = extractJson(text);
  return Array.isArray(parsed) ? parsed : [];
}

// Takes the user's own typed field values and asks Gemini to clean/normalize
// them (consistent casing, DOB as DD/MM/YYYY, trimmed whitespace, etc) —
// it does NOT invent data for fields the user left blank; those stay as-is.
// If GEMINI_API_KEY isn't set, falls back to returning the values unchanged
// so the "AI se Form Bharo" step still works (just without AI cleanup).
export async function prepareFormData(userProfile, requiredFields) {
  if (!process.env.GEMINI_API_KEY) return { ...userProfile };

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0 },
  });

  const prompt = `Neeche diye gaye form field values ko saaf/normalize karo — jaise
naam ka proper capitalization, date ko DD/MM/YYYY format mein, extra spaces
hatao. KOI NAYI VALUE MAT BANAO — sirf jo diya gaya hai usko hi साफ करो.
Agar koi field khaali hai to use khaali hi rehne do.

Required fields: ${JSON.stringify(requiredFields)}
User ne ye values di hain: ${JSON.stringify(userProfile)}

STRICT: sirf ek JSON object return karo jisme har required field ek key ho,
koi aur text ya markdown nahi. Example: {"fullName": "Ramesh Kumar", "dob": "05/08/1998"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || "";
    const parsed = extractJson(text);
    if (!parsed) return { ...userProfile };
    // Merge over the original so any field Gemini omitted still has the
    // user's original value rather than disappearing.
    return { ...userProfile, ...parsed };
  } catch {
    return { ...userProfile };
  }
}
