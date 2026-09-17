"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { formatMad } from "@/modules/public-booking/service";

function SuccessInner({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const orderId = sp.get("id") ?? "—";
  const total = Number(sp.get("total") ?? 0);
  const name = sp.get("name") ?? "";
  const lines = sp.get("lines") ?? "0";
  const wa = sp.get("wa");

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-3xl text-emerald-600">✓</p>
      <h1 className="mt-3 font-serif text-2xl font-semibold">Commande reçue</h1>
      <p className="mt-2 font-mono text-sm text-[#221820]/50">Commande #{orderId}</p>
      {name ? (
        <p className="mt-4 text-sm">
          Merci <strong>{name}</strong> !
        </p>
      ) : null}
      <p className="mt-2 text-sm text-[#221820]/55">
        Votre commande est enregistrée.
      </p>
      <div className="mt-6 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-[#E4BDC2]/35">
        <p>
          {lines} produit{Number(lines) > 1 ? "s" : ""}
        </p>
        <p className="mt-1 font-mono font-bold text-primary">
          Total : {formatMad(total)}
        </p>
        <p className="mt-3 text-[#221820]/55">Statut : En attente de confirmation</p>
        <p className="mt-1 text-xs text-emerald-700">Retrait à l&apos;institut</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center rounded-lg bg-[#7B5900] text-sm font-bold text-white"
          >
            Contacter l&apos;institut
          </a>
        ) : null}
        <Link
          href={bookPath(slug, "/products/")}
          className="flex h-11 items-center justify-center rounded-lg border border-[#E4BDC2]/50 text-sm font-bold"
        >
          Retour à la boutique
        </Link>
        <Link
          href={bookPath(slug)}
          className="text-sm font-semibold text-primary"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}

export function PublicOrderSuccessPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm">…</p>}>
      <SuccessInner slug={slug} />
    </Suspense>
  );
}
