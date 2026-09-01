"use client";

import { AppLoginForm } from "@/components/auth/app-login-form";

export default function AppLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,95,0.12),_transparent_50%)]"
      />
      <AppLoginForm />
    </div>
  );
}
