"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatMad,
  getPublicProducts,
  submitPublicProductOrder,
} from "@/modules/public-booking/service";
import type {
  PublicOrganizationProfile,
  PublicProductItem,
  PublicProductOrderResult,
} from "@/types/public-booking";

type CartLine = { productId: string; quantity: number };

type Props = {
  slug: string;
  org: PublicOrganizationProfile;
  onBackToRdv?: () => void;
};

export function BookingShopView({ slug, org, onBackToRdv }: Props) {
  const [products, setProducts] = useState<PublicProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [phase, setPhase] = useState<"catalog" | "checkout" | "done">("catalog");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicProductOrderResult | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPublicProducts(slug);
      setProducts(list);
    } catch {
      setError("Boutique indisponible pour le moment.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.brand ?? "").toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }, [products, q]);

  const cartDetailed = useMemo(() => {
    return cart
      .map((line) => {
        const p = products.find((x) => x.id === line.productId);
        if (!p) return null;
        return {
          ...line,
          product: p,
          lineTotal: p.salePrice * line.quantity,
        };
      })
      .filter(Boolean) as {
      productId: string;
      quantity: number;
      product: PublicProductItem;
      lineTotal: number;
    }[];
  }, [cart, products]);

  const cartTotal = cartDetailed.reduce((s, l) => s + l.lineTotal, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  function setQty(productId: string, quantity: number) {
    setCart((prev) => {
      const next = prev.filter((l) => l.productId !== productId);
      if (quantity <= 0) return next;
      return [...next, { productId, quantity: Math.min(20, quantity) }];
    });
  }

  function qtyOf(productId: string) {
    return cart.find((l) => l.productId === productId)?.quantity ?? 0;
  }

  async function handleSubmit() {
    if (!cartDetailed.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitPublicProductOrder(slug, {
        lines: cartDetailed.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        customer: {
          firstName,
          lastName,
          phone,
          email: email || null,
        },
        notes: notes || null,
      });
      setResult(res);
      setPhase("done");
      setCart([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la demande.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Chargement de la boutique…</p>;
  }

  if (phase === "done" && result) {
    return (
      <div className="surface space-y-4 p-6 text-center">
        <h2 className="font-display text-xl font-semibold">Demande envoyée</h2>
        <p className="text-sm text-ink/60">{result.message}</p>
        <p className="font-mono text-sm font-semibold text-primary">
          {formatMad(result.total)}
        </p>
        <ul className="space-y-1 text-left text-sm text-ink/70">
          {result.lines.map((l) => (
            <li key={l.productId}>
              {l.quantity}× {l.name} — {formatMad(l.lineTotal)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink/45">Réf. {result.orderId}</p>
        {result.whatsappUrl ? (
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex w-full justify-center"
          >
            Confirmer sur WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          className="w-full rounded-xl border border-line bg-white py-2.5 text-sm font-semibold"
          onClick={() => {
            setPhase("catalog");
            setResult(null);
          }}
        >
          Continuer mes achats
        </button>
        {onBackToRdv ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            onClick={onBackToRdv}
          >
            Prendre un rendez-vous
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === "checkout") {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Vos coordonnées</h2>
        <p className="text-sm text-ink/55">
          Click &amp; collect chez {org.name}. Paiement à l&apos;institut (pas de
          paiement en ligne).
        </p>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="surface space-y-2 p-4 text-sm">
          {cartDetailed.map((l) => (
            <div key={l.productId} className="flex justify-between gap-2">
              <span>
                {l.quantity}× {l.product.name}
              </span>
              <span className="font-mono">{formatMad(l.lineTotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatMad(cartTotal)}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <input
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
            placeholder="Téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
            placeholder="Email (optionnel)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            className="min-h-[80px] rounded-xl border border-line bg-white px-4 py-3 text-sm sm:col-span-2"
            placeholder="Note pour l’institut (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold"
            onClick={() => setPhase("catalog")}
          >
            Retour
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={
              submitting || !firstName.trim() || !lastName.trim() || phone.replace(/\D/g, "").length < 8
            }
            onClick={() => void handleSubmit()}
          >
            {submitting ? "…" : "Demander ces produits"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Boutique</h2>
        <p className="mt-1 text-sm text-ink/55">
          Réservez des produits à retirer à l&apos;institut. Paiement sur place.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="surface p-6 text-center text-sm text-ink/50">
          Aucun produit en vente pour le moment.
          {onBackToRdv ? (
            <button
              type="button"
              className="mt-3 block w-full text-sm font-semibold text-primary hover:underline"
              onClick={onBackToRdv}
            >
              Prendre un rendez-vous
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <input
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm"
            placeholder="Rechercher un produit…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="space-y-3">
            {filtered.map((p) => {
              const qty = qtyOf(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-ink/45">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.category}
                      {!p.inStock ? " · Rupture" : ""}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-primary">
                      {formatMad(p.salePrice)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {qty === 0 ? (
                      <button
                        type="button"
                        disabled={!p.inStock}
                        onClick={() => setQty(p.id, 1)}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        Ajouter
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm font-bold"
                          onClick={() => setQty(p.id, qty - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm font-bold"
                          onClick={() => setQty(p.id, qty + 1)}
                          disabled={qty >= 20}
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {cartCount > 0 ? (
        <div className="sticky bottom-4 rounded-2xl border border-line bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {cartCount} article{cartCount > 1 ? "s" : ""}
              </p>
              <p className="font-mono text-sm text-primary">{formatMad(cartTotal)}</p>
            </div>
            <button
              type="button"
              className="btn-primary px-5"
              onClick={() => setPhase("checkout")}
            >
              Commander
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
