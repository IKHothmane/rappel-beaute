"use client";

import { useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";

export default function SecurityPage() {
  const [msg, setMsg] = useState("");
  return (
    <>
      <AppPageHeader title="Sécurité" />
      <form
        className="surface max-w-md space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg("Mot de passe non modifié — démonstration.");
        }}
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nouveau mot de passe</span>
          <input type="password" className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Confirmation</span>
          <input type="password" className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary" />
        </label>
        <button type="submit" className="btn-primary">Modifier le mot de passe</button>
        {msg ? <p className="text-sm text-ink/55">{msg}</p> : null}
      </form>
      <div className="surface mt-4 max-w-md space-y-2 p-5 text-sm text-ink/65">
        <p className="font-medium text-ink">Sessions</p>
        <p>Dernière connexion : aujourd’hui 18:12</p>
        <button type="button" className="btn-ghost mt-2">Déconnecter tous les appareils</button>
        <p className="pt-2 text-xs text-ink/40">2FA — à activer en sprint Auth.</p>
      </div>
    </>
  );
}
