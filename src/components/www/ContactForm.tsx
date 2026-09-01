"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="surface p-8">
        <h2 className="font-display text-2xl font-semibold">Message reçu.</h2>
        <p className="mt-3 text-sm text-ink/70">Nous vous répondons à l’adresse indiquée.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-4 p-6 sm:p-8">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom</span>
        <input name="name" required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <input name="email" type="email" required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Message</span>
        <textarea name="message" rows={5} required className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </label>
      <button type="submit" className="btn-primary w-full sm:w-auto">
        Envoyer
      </button>
    </form>
  );
}
