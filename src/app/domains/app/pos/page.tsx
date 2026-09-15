import { Suspense } from "react";
import type { Metadata } from "next";
import { PosPageView } from "@/components/pos/pos-page";

export const metadata: Metadata = { title: "POS Produits" };

export default function PosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <PosPageView />
    </Suspense>
  );
}
