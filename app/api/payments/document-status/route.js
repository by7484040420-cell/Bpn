import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPaidForDocument } from "@/lib/db";
import { getDocumentById, getServiceFeePaise } from "@/data/documents";

export async function GET(req) {
  const sessionUser = await getSessionUser();
  const documentId = new URL(req.url).searchParams.get("documentId");
  const doc = getDocumentById(documentId);
  const feePaise = getServiceFeePaise(doc);

  if (feePaise <= 0) {
    return NextResponse.json({ feePaise: 0, paid: true });
  }
  if (!sessionUser) {
    return NextResponse.json({ feePaise, paid: false });
  }

  const paid = await hasPaidForDocument(sessionUser.mobile, documentId);
  return NextResponse.json({ feePaise, paid });
}
