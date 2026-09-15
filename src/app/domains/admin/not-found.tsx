import Link from "next/link";
import { adminHref } from "@/lib/admin/href";

export default function AdminNotFound() {
  return (
    <div className="ac-card p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--admin-accent)]">
        Page introuvable
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold">
        Page d’administration introuvable
      </h1>
      <Link href={adminHref("/dashboard/")} className="ac-btn mt-6 inline-flex">
        Tableau de bord
      </Link>
    </div>
  );
}
