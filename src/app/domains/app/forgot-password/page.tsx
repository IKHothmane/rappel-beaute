"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        className="surface w-full max-w-md p-8"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <h1 className="font-display text-2xl font-semibold">Mot de passe oublié ?</h1>
        <p className="mt-2 text-sm text-ink/60">Entrez votre e-mail pour recevoir un lien.</p>
        {sent ? (
          <p className="mt-6 text-sm text-ink/70">
            Si un compte existe, un lien a été envoyé.{" "}
            <Link href="/reset-password/" className="font-semibold text-primary">
              Ouvrir la réinitialisation (démo)
            </Link>
          </p>
        ) : (
          <>
            <label className="mt-6 block text-sm">
              <span className="mb-1.5 block font-medium">E-mail</span>
              <input type="email" required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <button type="submit" className="btn-primary mt-6 w-full">
              Recevoir le lien
            </button>
          </>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login/" className="text-primary">
            Retour connexion
          </Link>
        </p>
      </form>
    </div>
  );
}
