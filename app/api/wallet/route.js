import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getWalletBalance, getWalletLedger } from "@/lib/db";

// GET /api/wallet — balance + recent ledger entries. Used by the wallet
// widget in the UI so the user can always see exactly what happened to
// their money (topups, spends, refund-credits) instead of a single opaque
// number.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const [balancePaise, ledger] = await Promise.all([
    getWalletBalance(sessionUser.mobile),
    getWalletLedger(sessionUser.mobile, 20),
  ]);

  return NextResponse.json({ balancePaise, ledger });
}
