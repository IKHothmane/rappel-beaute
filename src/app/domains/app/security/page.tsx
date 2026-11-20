"use client";

import { AppPageHeader } from "@/components/app/AppUi";
import { AccountSecurityPanel } from "@/components/auth/account-security-panel";

export default function SecurityPage() {
  return (
    <>
      <AppPageHeader
        title="Sécuriser mon compte"
        description="Confirmez votre adresse e-mail, choisissez vos modes de connexion et protégez votre accès."
      />
      <AccountSecurityPanel />
      <div className="surface mt-4 max-w-md space-y-2 p-5 text-sm text-ink/65">
        <p className="font-medium text-ink">Sessions</p>
        <p>Dernière connexion : aujourd’hui 18:12</p>
        <button type="button" className="btn-ghost mt-2">Déconnecter tous les appareils</button>
        <p className="pt-2 text-xs text-ink/40">2FA — à activer en sprint Auth.</p>
      </div>
    </>
  );
}
