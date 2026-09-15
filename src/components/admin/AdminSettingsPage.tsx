"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import type { PlatformSettingsData } from "@/lib/db/platform-settings";
import {
  changeAdminPassword,
  fetchAdminSettings,
  patchAdminProfile,
  patchAdminSettings,
  type AdminSettingsBundle,
} from "@/modules/admin/settings";
import { PLAN_LABEL } from "@/types/platform";

type SectionId =
  | "profile"
  | "users"
  | "orgs"
  | "subscriptions"
  | "payments"
  | "notifications"
  | "support"
  | "whatsapp"
  | "ai"
  | "security"
  | "emails"
  | "billing"
  | "platform"
  | "audit"
  | "danger";

const NAV: { id: SectionId; label: string; group?: string }[] = [
  { id: "profile", label: "Mon profil", group: "Compte" },
  { id: "users", label: "Utilisateurs", group: "Gestion" },
  { id: "orgs", label: "Organisations", group: "Gestion" },
  { id: "subscriptions", label: "Abonnements", group: "Business" },
  { id: "payments", label: "Paiements", group: "Business" },
  { id: "billing", label: "Facturation", group: "Business" },
  { id: "notifications", label: "Notifications", group: "Comms" },
  { id: "emails", label: "Emails", group: "Comms" },
  { id: "support", label: "Support", group: "Comms" },
  { id: "whatsapp", label: "WhatsApp", group: "Intégrations" },
  { id: "ai", label: "IA", group: "Intégrations" },
  { id: "security", label: "Sécurité", group: "Système" },
  { id: "platform", label: "Plateforme", group: "Système" },
  { id: "audit", label: "Audit Logs", group: "Système" },
  { id: "danger", label: "Zone dangereuse", group: "Système" },
];

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {desc ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{desc}</p> : null}
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  onSave,
  label = "Enregistrer",
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" className="ac-btn" disabled={saving} onClick={onSave}>
        {saving ? "…" : label}
      </button>
      {saved ? <span className="text-sm text-emerald-700">Enregistré</span> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-line"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--admin-muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary/40";

export function AdminSettingsPage() {
  const [section, setSection] = useState<SectionId>("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AdminSettingsBundle | null>(null);
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState("fr");
  const [timezone, setTimezone] = useState("Africa/Casablanca");
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchAdminSettings();
    setBundle(data);
    setSettings(data.settings);
    if (data.profile) {
      setFirstName(data.profile.firstName);
      setLastName(data.profile.lastName);
      setEmail(data.profile.email);
      setPhone(data.profile.phone ?? "");
      setLocale(data.profile.locale);
      setTimezone(data.profile.timezone);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as SectionId;
    if (NAV.some((n) => n.id === hash)) setSection(hash);
  }, []);

  function go(id: SectionId) {
    setSection(id);
    setSaved(false);
    setError(null);
    window.history.replaceState(null, "", `#${id}`);
  }

  async function saveSettings(patch: Partial<PlatformSettingsData>) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await patchAdminSettings(patch);
      setSettings(res.settings);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await patchAdminProfile({
        firstName,
        lastName,
        email,
        phone: phone || null,
        locale,
        timezone,
      });
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    setPwdMsg(null);
    try {
      await changeAdminPassword({ currentPassword: curPwd, newPassword: newPwd });
      setCurPwd("");
      setNewPwd("");
      setPwdMsg("Mot de passe mis à jour.");
    } catch (e) {
      setPwdMsg(e instanceof Error ? e.message : "Erreur");
    }
  }

  let lastGroup = "";

  return (
    <>
      <AdminPageHeader
        title="Paramètres"
        description="Configurez et administrez Rappel Beauty."
      />

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="ac-card h-fit p-2 text-sm lg:sticky lg:top-4">
            {NAV.map((item) => {
              const showGroup = item.group && item.group !== lastGroup;
              if (item.group) lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup ? (
                    <p className="mb-1 mt-3 px-3 font-mono text-[10px] uppercase tracking-wide text-[var(--admin-muted)] first:mt-1">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    className={`mb-0.5 block w-full rounded-lg px-3 py-2 text-left transition ${
                      section === item.id
                        ? "bg-primary-light font-medium text-primary-dark"
                        : item.id === "danger"
                          ? "text-red-700 hover:bg-red-50"
                          : "text-ink/75 hover:bg-[#FBF4F6]"
                    }`}
                  >
                    {item.label}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="ac-card min-h-[420px] p-5 sm:p-6">
            {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

            {section === "profile" && settings ? (
              <>
                <SectionTitle title="Mon profil" desc="Paramètres du compte Super Admin." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Prénom">
                    <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </Field>
                  <Field label="Nom">
                    <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Téléphone">
                    <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212…" />
                  </Field>
                  <Field label="Langue">
                    <select className={inputClass} value={locale} onChange={(e) => setLocale(e.target.value)}>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label="Fuseau horaire">
                    <select className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="Africa/Casablanca">Africa/Casablanca</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </Field>
                </div>
                <SaveBar saving={saving} saved={saved} onSave={() => void saveProfile()} />

                <div className="mt-8 border-t border-line pt-6">
                  <h3 className="mb-3 font-medium">Changer mon mot de passe</h3>
                  <div className="grid max-w-md gap-3">
                    <Field label="Mot de passe actuel">
                      <input className={inputClass} type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} />
                    </Field>
                    <Field label="Nouveau mot de passe">
                      <input className={inputClass} type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                    </Field>
                    <button type="button" className="ac-btn-ghost w-fit" onClick={() => void savePassword()}>
                      Mettre à jour le mot de passe
                    </button>
                    {pwdMsg ? <p className="text-sm text-[var(--admin-muted)]">{pwdMsg}</p> : null}
                  </div>
                </div>
              </>
            ) : null}

            {section === "users" && bundle ? (
              <>
                <SectionTitle title="Utilisateurs" desc="Gestion globale des comptes." />
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <StatTile label="Utilisateurs" value={String(bundle.snapshots.users)} />
                  <StatTile label="Instituts" value={String(bundle.snapshots.orgs)} />
                  <StatTile label="Tickets ouverts" value={String(bundle.snapshots.openTickets)} />
                </div>
                <p className="mb-4 text-sm text-[var(--admin-muted)]">
                  Voir, modifier, bloquer, réinitialiser le mot de passe (Beauty2026!), forcer le changement au login.
                </p>
                <Link href={adminHref("/users/")} className="ac-btn inline-flex">
                  Ouvrir la gestion des utilisateurs
                </Link>
              </>
            ) : null}

            {section === "orgs" && bundle ? (
              <>
                <SectionTitle title="Organisations" desc="Instituts de la plateforme." />
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <StatTile label="Instituts actifs" value={String(bundle.snapshots.orgs)} />
                  <StatTile label="MRR" value={`${bundle.snapshots.mrr.toLocaleString("fr-MA")} MAD`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={adminHref("/organizations/")} className="ac-btn">
                    Voir les organisations
                  </Link>
                  <Link href={adminHref("/organizations/new/")} className="ac-btn-ghost">
                    + Ajouter une organisation
                  </Link>
                </div>
              </>
            ) : null}

            {section === "subscriptions" && settings ? (
              <>
                <SectionTitle title="Abonnement" desc="Offre unique Rappel Beauty." />
                <div className="mb-6 rounded-xl border border-line bg-[#FBF4F6] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
                    Offre Rappel Beauty
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold">
                    {settings.billing.price} {settings.billing.currency}{" "}
                    <span className="text-base font-normal text-[var(--admin-muted)]">/ mois</span>
                  </p>
                  <ul className="mt-4 grid gap-1 text-sm text-ink/80 sm:grid-cols-2">
                    {[
                      "Gestion des clientes",
                      "Rendez-vous & agenda",
                      "Stock & caisse",
                      "Marketing & WhatsApp",
                      "IA & Analytics",
                      "Support",
                    ].map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={adminHref("/subscriptions/")} className="ac-btn">
                    Gérer les abonnements instituts
                  </Link>
                  <Link href={adminHref("/plans/")} className="ac-btn-ghost">
                    Modifier l&apos;offre / plans
                  </Link>
                </div>
              </>
            ) : null}

            {section === "payments" && bundle ? (
              <>
                <SectionTitle title="Paiements" desc="Vue Super Admin des encaissements SaaS." />
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatTile label="MRR" value={`${bundle.snapshots.mrr.toLocaleString("fr-MA")} MAD`} />
                  <StatTile label="Paiements reçus" value={String(bundle.snapshots.paymentsReceived)} />
                  <StatTile label="En attente" value={String(bundle.snapshots.paymentsPending)} />
                  <StatTile label="Échoués" value={String(bundle.snapshots.paymentsFailed)} />
                </div>
                {bundle.snapshots.recentPayments.length > 0 ? (
                  <div className="mb-4 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-line text-[11px] uppercase text-[var(--admin-muted)]">
                        <tr>
                          <th className="px-3 py-2">Organisation</th>
                          <th className="px-3 py-2">Montant</th>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundle.snapshots.recentPayments.map((l) => (
                          <tr key={l.id} className="border-b border-line/60">
                            <td className="px-3 py-2">{l.organizationName}</td>
                            <td className="px-3 py-2 font-mono">{l.amount} MAD</td>
                            <td className="px-3 py-2">{PLAN_LABEL[l.plan] ?? l.plan}</td>
                            <td className="px-3 py-2">{l.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-[var(--admin-muted)]">Aucun paiement listé.</p>
                )}
                <Link href={adminHref("/billing/")} className="ac-btn inline-flex">
                  Ouvrir la facturation
                </Link>
              </>
            ) : null}

            {section === "notifications" && settings ? (
              <>
                <SectionTitle title="Notifications" desc="Alertes e-mail et internes." />
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Email</p>
                    <div className="space-y-2">
                      <Toggle
                        label="Nouveau ticket"
                        checked={settings.notifications.emailNewTicket}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailNewTicket: v },
                          })
                        }
                      />
                      <Toggle
                        label="Paiement reçu"
                        checked={settings.notifications.emailPaymentReceived}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailPaymentReceived: v },
                          })
                        }
                      />
                      <Toggle
                        label="Paiement échoué"
                        checked={settings.notifications.emailPaymentFailed}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailPaymentFailed: v },
                          })
                        }
                      />
                      <Toggle
                        label="Nouvel institut"
                        checked={settings.notifications.emailNewOrg}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailNewOrg: v },
                          })
                        }
                      />
                      <Toggle
                        label="Nouvel utilisateur"
                        checked={settings.notifications.emailNewUser}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailNewUser: v },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Notifications internes</p>
                    <div className="space-y-2">
                      <Toggle
                        label="Ticket urgent"
                        checked={settings.notifications.internalUrgentTicket}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, internalUrgentTicket: v },
                          })
                        }
                      />
                      <Toggle
                        label="Erreur système"
                        checked={settings.notifications.internalSystemError}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, internalSystemError: v },
                          })
                        }
                      />
                      <Toggle
                        label="Nouveau paiement"
                        checked={settings.notifications.internalNewPayment}
                        onChange={(v) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, internalNewPayment: v },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ notifications: settings.notifications })}
                />
              </>
            ) : null}

            {section === "support" && bundle ? (
              <>
                <SectionTitle title="Support" desc="Console tickets des instituts." />
                <StatTile label="Tickets ouverts" value={String(bundle.snapshots.openTickets)} />
                <div className="mt-4">
                  <Link href={adminHref("/support/tickets/")} className="ac-btn inline-flex">
                    Ouvrir Support
                  </Link>
                </div>
              </>
            ) : null}

            {section === "whatsapp" && bundle && settings ? (
              <>
                <SectionTitle
                  title="WhatsApp"
                  desc="Préparation de l'activation — secrets masqués."
                />
                <div className="mb-4 space-y-2 text-sm">
                  <p>
                    Statut envoi auto :{" "}
                    <strong>
                      {bundle.integrations.whatsapp.autoSendEnabled
                        ? "🟢 Activé"
                        : "🟡 Désactivé"}
                    </strong>
                  </p>
                  <p>
                    Mode actuel :{" "}
                    {bundle.integrations.whatsapp.mode === "manual"
                      ? "Ouvrir WhatsApp → envoi manuel"
                      : "API automatique"}
                  </p>
                  <p>
                    Webhook :{" "}
                    {bundle.integrations.whatsapp.webhookConfigured
                      ? "🟢 Configuré"
                      : "🔴 Incomplet"}
                  </p>
                  <p className="font-mono text-xs text-[var(--admin-muted)]">
                    Phone Number ID : {bundle.integrations.whatsapp.phoneNumberIdMasked || "—"}
                  </p>
                  <p className="font-mono text-xs text-[var(--admin-muted)]">
                    Verify Token : {bundle.integrations.whatsapp.verifyTokenMasked || "—"}
                  </p>
                </div>
                <Toggle
                  label="Préférer l'envoi manuel (recommandé pour l'instant)"
                  checked={settings.whatsapp.preferManualSend}
                  onChange={(v) =>
                    setSettings({ ...settings, whatsapp: { preferManualSend: v } })
                  }
                />
                <p className="mt-3 text-xs text-amber-800">
                  L&apos;activation réelle de l&apos;API se fait via les variables
                  d&apos;environnement serveur (jamais affichées en clair ici).
                </p>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ whatsapp: settings.whatsapp })}
                />
              </>
            ) : null}

            {section === "ai" && settings && bundle ? (
              <>
                <SectionTitle title="Intelligence artificielle" />
                <p className="mb-3 text-sm text-[var(--admin-muted)]">
                  Provider env : {bundle.integrations.ai.provider} · modèle{" "}
                  {bundle.integrations.ai.model}
                  {bundle.integrations.ai.configured
                    ? ` · clé ${bundle.integrations.ai.keyMasked}`
                    : " · mode mock"}
                </p>
                <div className="space-y-2">
                  <Toggle
                    label="IA Marketing"
                    checked={settings.ai.marketing}
                    onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, marketing: v } })}
                  />
                  <Toggle
                    label="Génération de messages"
                    checked={settings.ai.generation}
                    onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, generation: v } })}
                  />
                  <Toggle
                    label="Suggestions automatiques"
                    checked={settings.ai.suggestions}
                    onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, suggestions: v } })}
                  />
                </div>
                <div className="mt-4 grid max-w-md gap-3 sm:grid-cols-2">
                  <Field label="Limite mensuelle">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={settings.ai.monthlyLimit}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai: { ...settings.ai, monthlyLimit: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </Field>
                  <Field label="Modèle">
                    <select
                      className={inputClass}
                      value={settings.ai.model}
                      onChange={(e) =>
                        setSettings({ ...settings, ai: { ...settings.ai, model: e.target.value } })
                      }
                    >
                      <option value="gpt">GPT</option>
                      <option value="gpt-4o-mini">GPT-4o mini</option>
                      <option value="mock">Mock</option>
                    </select>
                  </Field>
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ ai: settings.ai })}
                />
              </>
            ) : null}

            {section === "security" && settings ? (
              <>
                <SectionTitle title="Sécurité" desc="Protections d'authentification plateforme." />
                <div className="space-y-2">
                  <Toggle
                    label="Session sécurisée"
                    checked={settings.security.secureSession}
                    onChange={(v) =>
                      setSettings({ ...settings, security: { ...settings.security, secureSession: v } })
                    }
                  />
                  <Toggle
                    label="Forcer changement mot de passe temporaire"
                    checked={settings.security.forceTempPasswordChange}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, forceTempPasswordChange: v },
                      })
                    }
                  />
                  <Toggle
                    label="Expiration des sessions"
                    checked={settings.security.sessionExpiry}
                    onChange={(v) =>
                      setSettings({ ...settings, security: { ...settings.security, sessionExpiry: v } })
                    }
                  />
                  <Toggle
                    label="Protection brute-force"
                    checked={settings.security.bruteForceProtection}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, bruteForceProtection: v },
                      })
                    }
                  />
                </div>
                <div className="mt-6 rounded-xl border border-line p-4">
                  <p className="text-sm font-medium">Double authentification (2FA)</p>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">
                    {settings.security.twoFactorEnabled ? "🟢 Activée" : "🔴 Désactivée"}
                  </p>
                  <button
                    type="button"
                    className="ac-btn-ghost mt-3"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          twoFactorEnabled: !settings.security.twoFactorEnabled,
                        },
                      })
                    }
                  >
                    {settings.security.twoFactorEnabled ? "Désactiver 2FA" : "Activer 2FA (préparation)"}
                  </button>
                  <p className="mt-2 text-xs text-[var(--admin-muted)]">
                    L&apos;enrôlement TOTP complet sera branché ensuite — le flag est déjà persisté.
                  </p>
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ security: settings.security })}
                />
              </>
            ) : null}

            {section === "emails" && settings && bundle ? (
              <>
                <SectionTitle title="Configuration Email" />
                <p className="mb-3 text-sm text-[var(--admin-muted)]">
                  Resend :{" "}
                  {bundle.integrations.email.resendConfigured
                    ? `configuré (${bundle.integrations.email.keyMasked})`
                    : "clé absente — branchez RESEND_API_KEY"}
                </p>
                <div className="grid max-w-lg gap-3">
                  <Field label="Fournisseur">
                    <select
                      className={inputClass}
                      value={settings.email.provider}
                      onChange={(e) =>
                        setSettings({ ...settings, email: { ...settings.email, provider: e.target.value } })
                      }
                    >
                      <option value="resend">Resend</option>
                      <option value="smtp">SMTP</option>
                    </select>
                  </Field>
                  <Field label="Email expéditeur">
                    <input
                      className={inputClass}
                      value={settings.email.fromEmail}
                      onChange={(e) =>
                        setSettings({ ...settings, email: { ...settings.email, fromEmail: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Nom expéditeur">
                    <input
                      className={inputClass}
                      value={settings.email.fromName}
                      onChange={(e) =>
                        setSettings({ ...settings, email: { ...settings.email, fromName: e.target.value } })
                      }
                    />
                  </Field>
                  <Toggle
                    label="Emails transactionnels"
                    checked={settings.email.transactional}
                    onChange={(v) =>
                      setSettings({ ...settings, email: { ...settings.email, transactional: v } })
                    }
                  />
                  <Toggle
                    label="Emails support"
                    checked={settings.email.support}
                    onChange={(v) =>
                      setSettings({ ...settings, email: { ...settings.email, support: v } })
                    }
                  />
                  <Toggle
                    label="Emails facturation"
                    checked={settings.email.billing}
                    onChange={(v) =>
                      setSettings({ ...settings, email: { ...settings.email, billing: v } })
                    }
                  />
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ email: settings.email })}
                />
              </>
            ) : null}

            {section === "billing" && settings ? (
              <>
                <SectionTitle title="Facturation" desc="Paramètres tarifaires globaux." />
                <div className="grid max-w-lg gap-3 sm:grid-cols-2">
                  <Field label="Prix abonnement">
                    <input
                      className={inputClass}
                      type="number"
                      value={settings.billing.price}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: { ...settings.billing, price: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </Field>
                  <Field label="Devise">
                    <input
                      className={inputClass}
                      value={settings.billing.currency}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: { ...settings.billing, currency: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="TVA %">
                    <input
                      className={inputClass}
                      type="number"
                      value={settings.billing.vatPercent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: { ...settings.billing, vatPercent: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </Field>
                  <Field label="Période">
                    <select
                      className={inputClass}
                      value={settings.billing.period}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: {
                            ...settings.billing,
                            period: e.target.value as "MONTHLY" | "YEARLY",
                          },
                        })
                      }
                    >
                      <option value="MONTHLY">Mensuelle</option>
                      <option value="YEARLY">Annuelle</option>
                    </select>
                  </Field>
                  <Field label="Jours avant rappel">
                    <input
                      className={inputClass}
                      type="number"
                      value={settings.billing.reminderDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: {
                            ...settings.billing,
                            reminderDays: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label="Jours après échéance avant suspension">
                    <input
                      className={inputClass}
                      type="number"
                      value={settings.billing.suspendAfterDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          billing: {
                            ...settings.billing,
                            suspendAfterDays: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Field>
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ billing: settings.billing })}
                />
              </>
            ) : null}

            {section === "platform" && settings ? (
              <>
                <SectionTitle title="Plateforme" desc="Paramètres généraux." />
                <div className="grid max-w-lg gap-3 sm:grid-cols-2">
                  <Field label="Nom">
                    <input
                      className={inputClass}
                      value={settings.platform.name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          platform: { ...settings.platform, name: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="URL">
                    <input
                      className={inputClass}
                      value={settings.platform.url}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          platform: { ...settings.platform, url: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Langue par défaut">
                    <select
                      className={inputClass}
                      value={settings.platform.locale}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          platform: { ...settings.platform, locale: e.target.value },
                        })
                      }
                    >
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                  <Field label="Fuseau horaire">
                    <select
                      className={inputClass}
                      value={settings.platform.timezone}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          platform: { ...settings.platform, timezone: e.target.value },
                        })
                      }
                    >
                      <option value="Africa/Casablanca">Africa/Casablanca</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </Field>
                  <Field label="Devise">
                    <input
                      className={inputClass}
                      value={settings.platform.currency}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          platform: { ...settings.platform, currency: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-sm font-medium">
                    Mode maintenance :{" "}
                    {settings.platform.maintenance ? "🔴 Activé" : "🟢 Désactivé"}
                  </p>
                  <p className="mt-1 text-xs text-amber-900/70">
                    Les utilisateurs ne pourront plus accéder à l&apos;application.
                  </p>
                  <button
                    type="button"
                    className="ac-btn-ghost mt-3"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        platform: {
                          ...settings.platform,
                          maintenance: !settings.platform.maintenance,
                        },
                      })
                    }
                  >
                    {settings.platform.maintenance
                      ? "Désactiver la maintenance"
                      : "Activer la maintenance"}
                  </button>
                </div>
                <SaveBar
                  saving={saving}
                  saved={saved}
                  onSave={() => void saveSettings({ platform: settings.platform })}
                />
              </>
            ) : null}

            {section === "audit" ? (
              <>
                <SectionTitle
                  title="Journal d'activité"
                  desc="Historique des actions Super Admin."
                />
                <p className="mb-4 text-sm text-[var(--admin-muted)]">
                  Filtres par utilisateur, action, date et organisation disponibles sur la page
                  Audit.
                </p>
                <Link href={adminHref("/audit/")} className="ac-btn inline-flex">
                  Ouvrir les Audit Logs
                </Link>
              </>
            ) : null}

            {section === "danger" && settings ? (
              <>
                <SectionTitle title="Zone dangereuse" desc="Actions critiques — confirmation requise." />
                <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-red-950">Mode maintenance</p>
                      <p className="text-sm text-red-900/70">Bloque l&apos;accès app pour tous les instituts.</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Confirmer le basculement du mode maintenance ?",
                          )
                        )
                          return;
                        void saveSettings({
                          platform: {
                            ...settings.platform,
                            maintenance: !settings.platform.maintenance,
                          },
                        });
                      }}
                    >
                      {settings.platform.maintenance ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200/80 pt-4">
                    <div>
                      <p className="font-medium text-red-950">Supprimer une organisation</p>
                      <p className="text-sm text-red-900/70">
                        Action irréversible — passez par la fiche institut.
                      </p>
                    </div>
                    <Link
                      href={adminHref("/organizations/")}
                      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800"
                    >
                      Aller aux organisations
                    </Link>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
