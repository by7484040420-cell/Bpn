"use client";

import LoginCard from "@/components/LoginCard";

// Thin wrapper: LoginCard has all the actual UI + mobile/OTP logic (shared
// with the standalone /login page at app/login/page.js). This just gives it
// a fixed-overlay position so it works as a popup on top of the current page.
export default function LoginModal({ onClose, onSuccess }) {
  return (
    <div className="fixed inset-0 z-[60]">
      <LoginCard onSuccess={onSuccess} onClose={onClose} />
    </div>
  );
}
