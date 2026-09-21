import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUsers } from "@/lib/db";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const users = (await getUsers())
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const today = new Date().toDateString();
  const stats = {
    totalUsers: users.length,
    signupsToday: users.filter((u) => new Date(u.createdAt).toDateString() === today).length,
    activeToday: users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length,
  };

  return NextResponse.json({ users, stats });
}
