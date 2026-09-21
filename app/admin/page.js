import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user) redirect("/");
  if (!user.isAdmin) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-display font-bold text-xl mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500">
          Yeh panel sirf admin ke liye hai. Agar tumhe lagta hai yeh galti
          hai, apna mobile number{" "}
          <code className="bg-slate-100 px-1 rounded">ADMIN_MOBILE_NUMBERS</code>{" "}
          env variable mein add karo.
        </p>
      </main>
    );
  }

  return <AdminDashboard adminMobile={user.mobile} />;
}
