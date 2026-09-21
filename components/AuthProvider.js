"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/components/LoginModal";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const pendingActionRef = useRef(null); // string href OR function

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Har link/action jisko login chahiye, yeh function ke through jaata hai.
  // Agar user already logged in hai to turant chalta hai, warna login modal
  // khulta hai aur success ke baad wahi action complete hota hai.
  //
  // TEMPORARY: SKIP_LOGIN_RIGHT_NOW = true — login abhi poochha hi nahi
  // jaata, links seedhe khulte hain. Yeh sirf Fast2SMS/OTP set hone se
  // pehle testing ke liye hai. Jab OTP live ho jaye, neeche wali line
  // "true" ko "false" kar dena (aur redeploy karna) taaki login wapas
  // zaroori ho jaaye — warna koi bhi bina login ke wallet/payment wale
  // steps tak pahunch sakta hai.
  const SKIP_LOGIN_RIGHT_NOW = true;

  const requireAuth = useCallback(
    (action) => {
      if (SKIP_LOGIN_RIGHT_NOW) {
        if (typeof action === "string") router.push(action);
        else if (typeof action === "function") action();
        return true;
      }
      if (user) {
        if (typeof action === "string") router.push(action);
        else if (typeof action === "function") action();
        return true;
      }
      pendingActionRef.current = action;
      setModalOpen(true);
      return false;
    },
    [user, router]
  );

  const handleLoginSuccess = useCallback(
    (loggedInUser) => {
      setUser(loggedInUser);
      setModalOpen(false);
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (typeof action === "string") router.push(action);
      else if (typeof action === "function") action();
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }, [router]);

  // Global gate: koi bhi internal <a>/<Link> click, agar user logged-in
  // nahi hai, to pehle login modal dikhao — click ko yahin rok do.
  useEffect(() => {
    if (loading) return;

    function onDocumentClick(e) {
      if (user) return;

      const anchor = e.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      const isInternal = href.startsWith("/") && !href.startsWith("//");
      const isExempt =
        href === "/" ||
        href.startsWith("/api/") ||
        anchor.hasAttribute("data-no-auth-gate");

      if (!isInternal || isExempt) return;

      e.preventDefault();
      requireAuth(href);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [user, loading, requireAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, requireAuth, logout, refreshSession }}>
      {children}
      {modalOpen && (
        <LoginModal
          onClose={() => {
            setModalOpen(false);
            pendingActionRef.current = null;
          }}
          onSuccess={handleLoginSuccess}
        />
      )}
    </AuthContext.Provider>
  );
}
