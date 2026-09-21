import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { approvePendingJob } from "@/lib/db";
import { enqueueJobAlert } from "@/lib/queue";

export async function POST(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const overrides = await req.json().catch(() => ({}));
  const job = await approvePendingJob(params.id, overrides);
  if (!job) {
    return NextResponse.json({ error: "Pending item nahi mila." }, { status: 404 });
  }

  // GAP FIX: pehle koi WhatsApp/email alert nahi jaata tha. Notification
  // fan-out queue mein daal dete hain (background mein worker.mjs process
  // karega) — is request ko subscribers ki sending ka wait nahi karna
  // padta, turant response milta hai admin ko.
  try {
    await enqueueJobAlert(job);
  } catch (err) {
    // Redis down ho to bhi job approval fail nahi honi chahiye — sirf log
    // karo, admin ko blocking error mat do.
    console.error("Failed to enqueue job alert:", err.message);
  }

  return NextResponse.json({ job });
}
