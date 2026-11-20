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
        <p>Pour fermer les sessions ouvertes sur vos autres appareils, changez votre mot de passe : seule la session en cours est conservée.</p>
      </div>
    </>
  );
}
