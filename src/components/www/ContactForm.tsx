"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";

const field =
  "w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary";

export function ContactForm() {
  const [opened, setOpened] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();
    const body = [
      `Nom : ${name}`,
      `E-mail : ${email}`,
      phone ? `Téléphone : ${phone}` : "",
      "",
      message,
    ]
      .filter((line) => line !== "")
      .join("\n");
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-4 p-6 sm:p-8">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom</span>
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">
          Téléphone <span className="font-normal text-ink/45">(facultatif)</span>
        </span>
        <input name="phone" type="tel" autoComplete="tel" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Sujet</span>
        <input name="subject" required className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Message</span>
        <textarea name="message" rows={5} required className={field} />
      </label>
      <button type="submit" className="btn-primary w-full sm:w-auto">
        Envoyer
      </button>
      {opened ? (
        <p className="text-sm text-ink/70">
          Votre application de messagerie s&apos;ouvre pour écrire à {SITE.email}.
        </p>
      ) : null}
    </form>
  );
}
