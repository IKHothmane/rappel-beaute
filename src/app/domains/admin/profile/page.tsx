"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin/href";

/** Profil consolidé dans Paramètres → Mon profil */
export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(adminHref("/settings/#profile"));
  }, [router]);
  return <p className="text-sm text-[var(--admin-muted)]">Redirection…</p>;
}
