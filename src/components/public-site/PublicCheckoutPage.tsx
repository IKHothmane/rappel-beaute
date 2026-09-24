"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import {
  formatMad,
  getPublicOrganization,
  submitPublicProductOrder,
} from "@/modules/public-booking/service";
import type { PublicOrganizationProfile } from "@/types/public-booking";

export function PublicCheckoutPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { lines, total, clear, count } = usePublicCart();
  const [org, setOrg] = useState<PublicOrganizationProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicOrganization(slug).then(setOrg).catch(() => setOrg(null));
  }, [slug]);

  useEffect(() => {
    if (count === 0) {
      router.replace(bookPath(slug, "/cart/"));
    }
  }, [count, router, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitPublicProductOrder(slug, {
        lines: lines.map((l) => ({
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
      clear();
      const q = new URLSearchParams({
        id: result.orderId,
        total: String(result.total),
        name: firstName,
        lines: String(result.lines.length),
      });
      if (result.whatsappUrl) q.set("wa", result.whatsappUrl);
      router.push(`${bookPath(slug, "/order/success/")}?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur commande");
    } finally {
      setSubmitting(false);
    }
  }

  if (count === 0) {
    return <p className="py-16 text-center text-sm text-[#746970]">Redirection…</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold text-[#241A22]">Commander</h1>
      <p className="mt-1 text-sm text-[#746970]">
        Click &amp; collect · paiement lors du retrait
      </p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-[#241A22]">Vos informations</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              className="rounded-xl border border-[#EBDDE4] bg-white px-4 py-3 text-sm outline-none focus:border-[#B76E79]"
              placeholder="Prénom *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              required
              className="rounded-xl border border-[#EBDDE4] bg-white px-4 py-3 text-sm outline-none focus:border-[#B76E79]"
              placeholder="Nom *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              required
              className="rounded-xl border border-[#EBDDE4] bg-white px-4 py-3 text-sm outline-none focus:border-[#B76E79] sm:col-span-2"
              placeholder="Téléphone *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="rounded-xl border border-[#EBDDE4] bg-white px-4 py-3 text-sm outline-none focus:border-[#B76E79] sm:col-span-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              className="min-h-[72px] rounded-xl border border-[#EBDDE4] bg-white px-4 py-3 text-sm outline-none focus:border-[#B76E79] sm:col-span-2"
              placeholder="Note (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#EBDDE4] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#241A22]">Mode de récupération</h2>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="radio" checked readOnly className="mt-1 accent-[#B76E79]" />
            <span>
              <strong>Retrait à l&apos;institut</strong>
              <span className="mt-0.5 block text-[#746970]">
                {org?.name ?? "Institut"}
                {org?.city ? ` · ${org.city}` : ""}
                {org?.address ? ` — ${org.address}` : ""}
              </span>
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-[#EBDDE4] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#241A22]">Paiement</h2>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="radio" checked readOnly className="mt-1 accent-[#B76E79]" />
            <span>
              <strong>Paiement lors du retrait</strong>
              <span className="mt-0.5 block text-[#746970]">
                Espèces ou carte à l&apos;institut
              </span>
            </span>
          </label>
        </section>

        <section className="rounded-2xl bg-[#FBECEF] p-4 text-sm">
          <h2 className="font-bold text-[#241A22]">Votre commande</h2>
          <p className="mt-1 text-[#746970]">
            {count} produit{count > 1 ? "s" : ""}
          </p>
          <p className="mt-2 text-lg font-bold text-[#B14F5E]">{formatMad(total)}</p>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#B76E79] text-sm font-semibold text-white hover:bg-[#9F5C67] disabled:opacity-60"
        >
          {submitting ? "…" : "Confirmer la commande"}
        </button>
        <Link
          href={bookPath(slug, "/cart/")}
          className="block text-center text-sm font-semibold text-[#B76E79]"
        >
          Retour au panier
        </Link>
      </form>
    </div>
  );
}
