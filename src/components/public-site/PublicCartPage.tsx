"use client";

import Link from "next/link";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { formatMad } from "@/modules/public-booking/service";

export function PublicCartPage({ slug }: { slug: string }) {
  const { lines, total, setQty, removeItem } = usePublicCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Votre panier</h1>
        <p className="mt-3 text-sm text-[#221820]/55">Votre panier est vide.</p>
        <Link
          href={bookPath(slug, "/products/")}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-[#7B5900] px-5 text-sm font-bold text-white"
        >
          Voir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl font-semibold">Votre panier</h1>
      <p className="mt-1 text-xs font-semibold text-emerald-700">✓ Retrait à l&apos;institut</p>

      <ul className="mt-6 space-y-3">
        {lines.map((l) => (
          <li
            key={l.productId}
            className="rounded-xl border border-[#E4BDC2]/35 bg-white p-4 shadow-sm"
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={bookPath(slug, `/products/${l.slug}/`)}
                  className="font-semibold hover:text-primary"
                >
                  {l.name}
                </Link>
                <p className="mt-1 font-mono text-sm text-primary">
                  {formatMad(l.salePrice)}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-[#221820]/40 hover:text-red-600"
                onClick={() => removeItem(l.productId)}
              >
                Retirer
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                onClick={() => setQty(l.productId, l.quantity - 1)}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                onClick={() => setQty(l.productId, l.quantity + 1)}
              >
                +
              </button>
              <span className="ml-auto font-mono text-sm font-bold">
                {formatMad(l.salePrice * l.quantity)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-1 border-t border-[#E4BDC2]/40 pt-4 text-sm">
        <div className="flex justify-between">
          <span>Sous-total</span>
          <span className="font-mono">{formatMad(total)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="font-mono text-primary">{formatMad(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={bookPath(slug, "/checkout/")}
          className="flex h-12 items-center justify-center rounded-lg bg-[#7B5900] text-sm font-bold text-white"
        >
          Commander
        </Link>
        <Link
          href={bookPath(slug, "/products/")}
          className="flex h-11 items-center justify-center rounded-lg border border-[#E4BDC2]/50 text-sm font-bold"
        >
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
