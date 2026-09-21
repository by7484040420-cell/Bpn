import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markRemittanceDone } from "@/lib/db";

// POST /api/admin/remittances/[id]/mark-done { reference }
// Admin calls this AFTER they've actually gone and paid the government fee
// on the real portal (NSDL/UTIITSL/Parivahan/etc) using their own agent
// login — this endpoint only records that it happened, with a reference
// number (transaction ID / acknowledgement number) for audit trail. It does
// not itself submit anything to any government site.
export async function POST(req, { params }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { reference } = await req.json().catch(() => ({}));
  if (!reference || !reference.trim()) {
    return NextResponse.json({ error: "Reference/acknowledgement number zaroori hai audit ke liye." }, { status: 400 });
  }

  const updated = await markRemittanceDone(params.id, reference.trim());
  if (!updated) {
    return NextResponse.json({ error: "Ye remittance nahi mila ya already remitted hai." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, remittance: updated });
}
