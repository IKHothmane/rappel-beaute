"use client";

import Link from "next/link";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { formatMad } from "@/modules/public-booking/service";

export function PublicCartPage({ slug }: { slug: string }) {
  const { lines, total, setQty, removeItem } = usePublicCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-serif text-3xl font-semibold text-[#241A22]">Votre panier</h1>
        <p className="mt-3 text-sm text-[#746970]">Votre panier est vide.</p>
        <Link
          href={bookPath(slug, "/products/")}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#B76E79] px-5 text-sm font-semibold text-white hover:bg-[#9F5C67]"
        >
          Voir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold text-[#241A22]">Votre panier</h1>
      <p className="mt-1 text-xs font-semibold text-emerald-700">
        ✓ Retrait à l&apos;institut
      </p>

      <ul className="mt-6 space-y-3">
        {lines.map((l) => (
          <li
            key={l.productId}
            className="rounded-2xl border border-[#EBDDE4] bg-white p-4 shadow-sm"
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={bookPath(slug, `/products/${l.slug}/`)}
                  className="font-semibold text-[#241A22] hover:text-[#B76E79]"
                >
                  {l.name}
                </Link>
                <p className="mt-1 text-sm font-semibold text-[#B14F5E]">
                  {formatMad(l.salePrice)}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-[#8B7E84] hover:text-red-600"
                onClick={() => removeItem(l.productId)}
              >
                Retirer
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EBDDE4]"
                onClick={() => setQty(l.productId, l.quantity - 1)}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EBDDE4]"
                onClick={() => setQty(l.productId, l.quantity + 1)}
              >
                +
              </button>
              <span className="ml-auto text-sm font-bold text-[#241A22]">
                {formatMad(l.salePrice * l.quantity)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-1 border-t border-[#EBDDE4] pt-4 text-sm">
        <div className="flex justify-between text-[#746970]">
          <span>Sous-total</span>
          <span>{formatMad(total)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-[#241A22]">
          <span>Total</span>
          <span className="text-[#B14F5E]">{formatMad(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={bookPath(slug, "/checkout/")}
          className="flex h-12 items-center justify-center rounded-xl bg-[#B76E79] text-sm font-semibold text-white hover:bg-[#9F5C67]"
        >
          Commander
        </Link>
        <Link
          href={bookPath(slug, "/products/")}
          className="flex h-11 items-center justify-center rounded-xl border border-[#EBDDE4] text-sm font-medium text-[#A55261]"
        >
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
