import { cookies } from "next/headers";
import { getSessionByToken, findUserByMobile } from "@/lib/db";

export const SESSION_COOKIE = "sarkari_session";

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getSessionByToken(token);
  if (!session) return null;

  const user = await findUserByMobile(session.mobile);
  if (!user) return null;

  return user;
}
