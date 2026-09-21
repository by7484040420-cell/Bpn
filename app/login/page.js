"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginCard from "@/components/LoginCard";
import { useAuth } from "@/components/AuthProvider";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  async function handleSuccess() {
    await refreshSession();
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
  }

  return <LoginCard onSuccess={handleSuccess} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-black" />}>
      <LoginPageInner />
    </Suspense>
  );
}
