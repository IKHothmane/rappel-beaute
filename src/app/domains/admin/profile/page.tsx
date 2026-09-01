"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { PLATFORM_USER, ROLE_LABEL } from "@/lib/admin-mock";

export default function ProfilePage() {
  const [msg, setMsg] = useState("");

  return (
    <>
      <AdminPageHeader title="Mon profil" description="Compte super administrateur." />

      <div className="mx-auto grid max-w-xl gap-6">
        <section className="ac-card space-y-3 p-6 text-sm">
          <p>
            <span className="text-[var(--admin-muted)]">Nom : </span>
            {PLATFORM_USER.name}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">E-mail : </span>
            {PLATFORM_USER.email}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Rôle : </span>
            {ROLE_LABEL[PLATFORM_USER.role]}
          </p>
        </section>

        <form
          className="ac-card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg("Mot de passe non modifié — démonstration.");
          }}
        >
          <h2 className="font-display text-lg font-semibold">Sécurité</h2>
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--admin-muted)]">Nouveau mot de passe</span>
            <input type="password" className="ac-input" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--admin-muted)]">Confirmation</span>
            <input type="password" className="ac-input" />
          </label>
          <button type="submit" className="ac-btn">
            Mettre à jour
          </button>
          {msg ? <p className="text-sm text-[var(--admin-muted)]">{msg}</p> : null}
        </form>
      </div>
    </>
  );
}
