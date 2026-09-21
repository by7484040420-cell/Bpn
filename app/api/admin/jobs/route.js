import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getJobs, addJob } from "@/lib/db";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ jobs: await getJobs() });
}

export async function POST(req) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  const { title, department, lastDate, officialUrl, color, logo } = body;

  if (!title || !lastDate || !officialUrl) {
    return NextResponse.json(
      { error: "Title, lastDate aur officialUrl zaroori hain." },
      { status: 400 }
    );
  }

  const job = await addJob({
    title,
    subtitle: body.subtitle || "",
    department: department || "",
    lastDate,
    color: color || "brandblue",
    logo: logo || "govt",
    fields: body.fields || ["fullName", "dob", "fatherName", "address", "qualification", "category", "mobile", "email"],
    officialUrl,
  });

  return NextResponse.json({ job });
}
