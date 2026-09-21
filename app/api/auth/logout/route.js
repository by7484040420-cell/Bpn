import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
