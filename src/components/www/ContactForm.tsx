"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Mail, MessageCircle, Phone, Send, User } from "lucide-react";
import { contactEmailHref } from "@/lib/contact-message";

export function ContactForm() {
  const [draft, setDraft] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("subject") === "demo") setSubject("Démonstration");
  }, [searchParams]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const href = contactEmailHref({
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      institute: String(data.get("institute") || ""),
      subject,
      message: String(data.get("message") || ""),
    });
    setDraft(href);
  }

  return (
    <form onSubmit={onSubmit} onChange={() => setDraft(null)} className="ct-form">
      <div className="ct-fields">
        <label>
          <span>Nom complet *</span>
          <div>
            <User aria-hidden="true" />
            <input
              name="name"
              required
              autoComplete="name"
              maxLength={100}
              placeholder="Votre nom"
            />
          </div>
        </label>
        <label>
          <span>E-mail *</span>
          <div>
            <Mail aria-hidden="true" />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              placeholder="vous@exemple.ma"
            />
          </div>
        </label>
        <label>
          <span>Téléphone (facultatif)</span>
          <div>
            <Phone aria-hidden="true" />
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={25}
              placeholder="06 00 00 00 00"
            />
          </div>
        </label>
        <label>
          <span>Nom de votre institut</span>
          <div>
            <Building2 aria-hidden="true" />
            <input
              name="institute"
              autoComplete="organization"
              maxLength={150}
              placeholder="Votre institut"
            />
          </div>
        </label>
      </div>
      <label>
        <span>Sujet de votre demande *</span>
        <div>
          <MessageCircle aria-hidden="true" />
          <select
            name="subject"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="" disabled>
              Choisir un sujet
            </option>
            {[
              "Démonstration",
              "Question sur le logiciel",
              "Création de site web",
              "Tarifs et abonnement",
              "Assistance",
              "Autre demande",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </label>
      <label>
        <span>Votre message *</span>
        <textarea
          name="message"
          rows={5}
          required
          maxLength={2000}
          placeholder="Comment pouvons-nous vous aider ?"
        />
      </label>
      <button type="submit" className="eng-button">
        <Send aria-hidden="true" />
        Préparer mon e-mail
      </button>
      {draft && (
        <div className="ct-draft" role="status">
          <p>Votre e-mail est prêt. Ouvrez votre messagerie pour l’envoyer à notre équipe.</p>
          <a href={draft}>
            <Mail aria-hidden="true" />
            Ouvrir ma messagerie
          </a>
        </div>
      )}
    </form>
  );
}
