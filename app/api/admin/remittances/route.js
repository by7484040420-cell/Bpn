import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPendingRemittances } from "@/lib/db";

// Admin queue of "collected from user, needs to actually be paid to the
// government portal" amounts. The admin logs into NSDL/UTIITSL/Parivahan
// etc. THEMSELVES (their own login, their own OTP) and pays these — this
// list is just the reconciliation view, it never pays anything itself.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ remittances: await getPendingRemittances() });
}
