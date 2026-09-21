// GAP FIX: pehle koi WhatsApp/email notification code tha hi nahi. Yeh dono
// providers fetch-based hain (koi SDK dependency nahi) — Meta ka official
// WhatsApp Cloud API, aur Resend (simple modern email API). Dono ke liye
// free tier available hai testing ke liye.

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "alerts@example.com";

export const whatsappConfigured = Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID);
export const emailConfigured = Boolean(RESEND_API_KEY);

/**
 * Sends a WhatsApp message via Meta's Cloud API using an approved template
 * (WhatsApp requires pre-approved templates for any message outside a
 * 24-hour user-initiated session — you can't just send free-text alerts).
 * Set up a template named "new_job_alert" with one body variable in
 * Meta Business Manager first: https://business.facebook.com
 */
export async function sendWhatsApp(toMobile, jobTitle) {
  if (!whatsappConfigured) throw new Error("WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID set nahi hai.");

  const res = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${toMobile}`,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME || "new_job_alert",
        language: { code: "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: jobTitle }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Sends a plain alert email via Resend (https://resend.com). */
export async function sendEmail(toEmail, jobTitle, jobUrl) {
  if (!emailConfigured) throw new Error("RESEND_API_KEY set nahi hai.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: toEmail,
      subject: `Naya Sarkari Job: ${jobTitle}`,
      html: `<p>Naya job aaya hai: <b>${escapeHtml(jobTitle)}</b></p><p><a href="${jobUrl}">Details dekho →</a></p>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
