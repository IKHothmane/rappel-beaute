"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Bolt,
  Brush,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  Diamond,
  KeyRound,
  Lock,
  Mail,
  Palette,
  RefreshCw,
  Save,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import type { PlatformSettingsData } from "@/lib/db/platform-settings";
import { cn } from "@/lib/utils";
import {
  changeAdminPassword,
  fetchAdminSettings,
  patchAdminProfile,
  patchAdminSettings,
  type AdminSettingsBundle,
} from "@/modules/admin/settings";

type SectionId =
  | "general"
  | "billing"
  | "email"
  | "notifications"
  | "whatsapp"
  | "security"
  | "storage"
  | "infra"
  | "appearance"
  | "advanced";

const NAV: {
  id: SectionId;
  label: string;
  icon: typeof Settings;
  badge?: string;
  danger?: boolean;
}[] = [
  { id: "general", label: "1. Général", icon: Settings, badge: "Prod" },
  { id: "billing", label: "2. Abonnements", icon: Diamond, badge: "MAD" },
  { id: "email", label: "3. Emails & SMTP", icon: Mail },
  { id: "notifications", label: "4. Notifications", icon: Bell, badge: "3 canaux" },
  { id: "whatsapp", label: "5. WhatsApp (V1)", icon: MessageCircle, badge: "Assisté" },
  { id: "security", label: "6. Sécurité Root", icon: Shield, badge: "2FA" },
  { id: "storage", label: "7. Stockage R2", icon: Cloud, badge: "Soft" },
  { id: "infra", label: "8. Système & Infra", icon: Cpu },
  { id: "appearance", label: "9. Marque Blanche", icon: Palette },
  { id: "advanced", label: "10. Zone Critique OTP", icon: KeyRound, danger: true },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-[#F0DDE9]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-xl bg-[#FFEFF8] px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20";

export function AdminPlatformSettingsView() {
  const [section, setSection] = useState<SectionId>("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AdminSettingsBundle | null>(null);
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [supportPhone, setSupportPhone] = useState("+212 522-894000");
  const [legalAddress, setLegalAddress] = useState(
    "Boulevard d'Anfa, 20050 Casablanca, Maroc",
  );
  const [replyTo, setReplyTo] = useState("conciergerie@rappelbeaute.ma");
  const [footerLegal, setFooterLegal] = useState(
    "Rappel Beauté Prestige Maroc — Solution SaaS certifiée CNDP",
  );
  const [trialDays, setTrialDays] = useState(14);
  const [yearlyPrice, setYearlyPrice] = useState(3990);
  const [founderCode] = useState("OFFRE_CASA_2026");

  const refresh = useCallback(async () => {
    const data = await fetchAdminSettings();
    setBundle(data);
    setSettings(data.settings);
    if (data.profile) {
      setFirstName(data.profile.firstName);
      setLastName(data.profile.lastName);
      setEmail(data.profile.email);
      setPhone(data.profile.phone ?? "");
    }
    setDirty(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const hash = window.location.hash.replace("#sec-", "").replace("#", "") as SectionId;
    if (NAV.some((n) => n.id === hash)) setSection(hash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function go(id: SectionId) {
    setSection(id);
    window.history.replaceState(null, "", `#sec-${id}`);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function patchLocal(partial: Partial<PlatformSettingsData>) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...partial,
        platform: { ...prev.platform, ...partial.platform },
        billing: { ...prev.billing, ...partial.billing },
        notifications: { ...prev.notifications, ...partial.notifications },
        email: { ...prev.email, ...partial.email },
        ai: { ...prev.ai, ...partial.ai },
        security: { ...prev.security, ...partial.security },
        whatsapp: { ...prev.whatsapp, ...partial.whatsapp },
      };
    });
    setDirty(true);
  }

  async function saveAll() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await patchAdminSettings(settings);
      await patchAdminProfile({
        firstName,
        lastName,
        email,
        phone: phone || null,
        timezone: settings.platform.timezone,
      });
      await refresh();
      setToast("Configuration enregistrée · audit PlatformConfig");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  function resetLocal() {
    void refresh().then(() => setToast("Modifications réinitialisées"));
  }

  async function savePassword() {
    try {
      await changeAdminPassword({
        currentPassword: curPwd,
        newPassword: newPwd,
      });
      setCurPwd("");
      setNewPwd("");
      setToast("Mot de passe mis à jour");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur mot de passe");
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-ink/45">Chargement de la configuration…</p>;
  }

  const integ = bundle?.integrations;
  const snap = bundle?.snapshots;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-12">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink/45">
            <span>Infrastructure</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-primary">
              Configuration Plateforme
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-ink">
              Configuration Plateforme SaaS
            </h1>
            <span className="rounded-full bg-[#FFDEA4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5D4200]">
              Super Admin Root
            </span>
            {dirty ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Non enregistré
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetLocal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-4 text-[12px] font-bold text-ink"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveAll()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[12px] font-bold text-white shadow-sm disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "…" : "Enregistrer la configuration"}
          </button>
        </div>
      </div>

      {/* Topology metrics */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Server className="h-5 w-5 text-primary" />}
          label="Nœud principal"
          title="Cluster Casa-01"
          hint="RLS multi-tenant"
        />
        <Metric
          icon={<Shield className="h-5 w-5 text-[#7B5900]" />}
          label="Isolation tenant"
          title="RLS Strict"
          hint={`${snap?.orgs ?? "—"} instituts`}
        />
        <Metric
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          label="Conformité CNDP"
          title="Loi 09-08"
          hint="Hébergement ciblé Maroc"
        />
        <Metric
          icon={<Bolt className="h-5 w-5 text-[#7B5900]" />}
          label="Statut moteur"
          title={settings.platform.maintenance ? "Maintenance" : "Production"}
          hint={
            settings.platform.maintenance
              ? "Accès salons suspendu"
              : "Maintenance inactive"
          }
        />
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Side nav */}
        <nav className="sticky top-28 space-y-1 rounded-2xl bg-white p-3 shadow-sm lg:col-span-3">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Domaines système
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : item.danger
                      ? "text-red-700 hover:bg-red-50"
                      : "text-ink hover:bg-[#FFEFF8]",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded px-1.5 text-[10px] font-bold",
                      active ? "bg-white/20" : "bg-[#FFEFF8] text-ink/50",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div className="mt-3 border-t border-[#FFEFF8] pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] p-2.5">
              <ShieldCheck className="h-5 w-5 text-[#7B5900]" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-ink">
                  Persist PlatformConfig
                </p>
                <p className="truncate text-[10px] text-ink/45">
                  Soft-degrade flags non branchés runtime
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-6 lg:col-span-9">
          {/* 1 General */}
          <Section
            id="general"
            icon={<Settings className="h-5 w-5" />}
            title="1. Paramètres généraux & identité"
            desc="Identité officielle du SaaS appliquée aux instituts."
            active={section === "general"}
            onVisible={() => setSection("general")}
          >
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-[#FFEFF8] p-4">
              <div>
                <p className="font-bold text-ink">Mode maintenance plateforme</p>
                <p className="text-[12px] text-ink/50">
                  Suspend l&apos;accès agendas (flag persisté — effet runtime soft).
                </p>
              </div>
              <Toggle
                checked={settings.platform.maintenance}
                onChange={(v) =>
                  patchLocal({ platform: { ...settings.platform, maintenance: v } })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nom officiel">
                <input
                  className={inputClass}
                  value={settings.platform.name}
                  onChange={(e) =>
                    patchLocal({
                      platform: { ...settings.platform, name: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="URL plateforme">
                <input
                  className={inputClass}
                  value={settings.platform.url}
                  onChange={(e) =>
                    patchLocal({
                      platform: { ...settings.platform, url: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Email support">
                <input
                  className={inputClass}
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(e) =>
                    patchLocal({
                      email: { ...settings.email, fromEmail: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Téléphone conciergerie (soft)">
                <input
                  className={inputClass}
                  value={supportPhone}
                  onChange={(e) => {
                    setSupportPhone(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Adresse légale (soft)">
                <input
                  className={inputClass}
                  value={legalAddress}
                  onChange={(e) => {
                    setLegalAddress(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Fuseau horaire">
                <select
                  className={inputClass}
                  value={settings.platform.timezone}
                  onChange={(e) =>
                    patchLocal({
                      platform: {
                        ...settings.platform,
                        timezone: e.target.value,
                      },
                    })
                  }
                >
                  <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                </select>
              </Field>
              <Field label="Devise">
                <select
                  className={inputClass}
                  value={settings.platform.currency}
                  onChange={(e) =>
                    patchLocal({
                      platform: {
                        ...settings.platform,
                        currency: e.target.value,
                      },
                      billing: {
                        ...settings.billing,
                        currency: e.target.value,
                      },
                    })
                  }
                >
                  <option value="MAD">MAD — Dirham Marocain</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-[#FFEFF8] p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink text-primary">
                  <span className="text-xl font-black">RB</span>
                </div>
                <div>
                  <p className="font-bold text-ink">Logo plateforme</p>
                  <p className="text-[12px] text-ink/50">
                    Soft — téléversement non branché
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToast("Upload logo : soft-degrade")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[12px] font-bold text-ink shadow-sm"
              >
                <Upload className="h-4 w-4" />
                Téléverser
              </button>
            </div>
          </Section>

          {/* 2 Billing */}
          <Section
            id="billing"
            icon={<Diamond className="h-5 w-5" />}
            title="2. Abonnements & facturation"
            desc="Grille tarifaire par défaut (PlatformConfig). Plans détaillés → /plans/."
            active={section === "billing"}
            onVisible={() => setSection("billing")}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-[#FFEFF8] p-4">
                <p className="text-[10px] font-bold uppercase text-ink/45">
                  Tarif mensuel
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    className="w-24 bg-transparent text-3xl font-black text-primary outline-none"
                    type="number"
                    value={settings.billing.price}
                    onChange={(e) =>
                      patchLocal({
                        billing: {
                          ...settings.billing,
                          price: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                  <span className="font-bold text-ink">DH / mois</span>
                </div>
              </div>
              <div className="rounded-xl bg-[#FFEFF8] p-4">
                <p className="text-[10px] font-bold uppercase text-[#7B5900]">
                  Tarif annuel (soft)
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    className="w-28 bg-transparent text-3xl font-black text-ink outline-none"
                    type="number"
                    value={yearlyPrice}
                    onChange={(e) => {
                      setYearlyPrice(Number(e.target.value) || 0);
                      setDirty(true);
                    }}
                  />
                  <span className="font-bold text-ink">DH / an</span>
                </div>
              </div>
              <div className="rounded-xl bg-[#FFEFF8] p-4">
                <p className="text-[10px] font-bold uppercase text-ink/45">
                  Essai gratuit (soft UI)
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    className="w-16 bg-transparent text-3xl font-black text-ink outline-none"
                    type="number"
                    value={trialDays}
                    onChange={(e) => {
                      setTrialDays(Number(e.target.value) || 0);
                      setDirty(true);
                    }}
                  />
                  <span className="font-bold text-ink">jours</span>
                </div>
                <p className="mt-1 text-[11px] text-ink/45">
                  Source réelle : Plan.trialDays
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="TVA %">
                <input
                  className={inputClass}
                  type="number"
                  value={settings.billing.vatPercent}
                  onChange={(e) =>
                    patchLocal({
                      billing: {
                        ...settings.billing,
                        vatPercent: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Relance avant échéance (jours)">
                <input
                  className={inputClass}
                  type="number"
                  value={settings.billing.reminderDays}
                  onChange={(e) =>
                    patchLocal({
                      billing: {
                        ...settings.billing,
                        reminderDays: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Suspension après impayé (jours)">
                <input
                  className={inputClass}
                  type="number"
                  value={settings.billing.suspendAfterDays}
                  onChange={(e) =>
                    patchLocal({
                      billing: {
                        ...settings.billing,
                        suspendAfterDays: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Période par défaut">
                <select
                  className={inputClass}
                  value={settings.billing.period}
                  onChange={(e) =>
                    patchLocal({
                      billing: {
                        ...settings.billing,
                        period: e.target.value as "MONTHLY" | "YEARLY",
                      },
                    })
                  }
                >
                  <option value="MONTHLY">Mensuel</option>
                  <option value="YEARLY">Annuel</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#FFDEA4]/35 p-4">
              <div>
                <p className="font-bold text-ink">
                  Code fondateur {founderCode}
                </p>
                <p className="text-[12px] text-ink/55">
                  Soft — campagne marketing (non branchée au checkout)
                </p>
              </div>
              <span className="rounded-full bg-[#7B5900] px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                Soft
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 text-center text-[12px]">
              {[
                ["J+0", "Grâce"],
                [`J+${Math.min(3, settings.billing.reminderDays)}`, "Relance"],
                [`J+${settings.billing.reminderDays}`, "Verrouillage"],
                [`J+${settings.billing.suspendAfterDays}`, "Suspension"],
              ].map(([d, l]) => (
                <div key={d} className="rounded-xl bg-[#FFEFF8] p-3">
                  <p className="text-[10px] font-bold uppercase text-ink/40">{d}</p>
                  <p className="font-semibold text-ink">{l}</p>
                </div>
              ))}
            </div>
            <Link
              href={adminHref("/plans/")}
              className="mt-4 inline-flex text-[12px] font-bold text-primary hover:underline"
            >
              Gérer les plans détaillés →
            </Link>
          </Section>

          {/* 3 Email */}
          <Section
            id="email"
            icon={<Mail className="h-5 w-5" />}
            title="3. Emails & SMTP"
            desc="Expéditeur transactionnel. Statut Resend = lecture env."
            active={section === "email"}
            onVisible={() => setSection("email")}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Tone
                ok={Boolean(integ?.email.resendConfigured)}
                label={
                  integ?.email.resendConfigured
                    ? `Resend configuré (${integ.email.keyMasked || "****"})`
                    : "Resend non configuré"
                }
              />
              <button
                type="button"
                onClick={() =>
                  setToast(
                    integ?.email.resendConfigured
                      ? "Resend OK — envoi test soft"
                      : "Configurer RESEND_API_KEY",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[12px] font-bold text-ink"
              >
                Tester l&apos;envoi
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Email expéditeur">
                <input
                  className={inputClass}
                  value={settings.email.fromEmail}
                  onChange={(e) =>
                    patchLocal({
                      email: { ...settings.email, fromEmail: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Nom expéditeur">
                <input
                  className={inputClass}
                  value={settings.email.fromName}
                  onChange={(e) =>
                    patchLocal({
                      email: { ...settings.email, fromName: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Reply-To (soft)">
                <input
                  className={inputClass}
                  value={replyTo}
                  onChange={(e) => {
                    setReplyTo(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {(
                [
                  ["transactional", "Transactionnel", settings.email.transactional],
                  ["support", "Support", settings.email.support],
                  ["billing", "Facturation", settings.email.billing],
                ] as const
              ).map(([key, label, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3"
                >
                  <span className="text-[12px] font-bold text-ink">{label}</span>
                  <Toggle
                    checked={val}
                    onChange={(v) =>
                      patchLocal({
                        email: { ...settings.email, [key]: v },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* 4 Notifications */}
          <Section
            id="notifications"
            icon={<Bell className="h-5 w-5" />}
            title="4. Notifications & alertes"
            desc="Matrice d’alertes Super Admin (persistées)."
            active={section === "notifications"}
            onVisible={() => setSection("notifications")}
          >
            <div className="space-y-2">
              {(
                [
                  ["internalSystemError", "Alertes système critiques", "email"],
                  ["internalNewPayment", "Revenus & facturation", "email"],
                  ["internalUrgentTicket", "Support urgent", "inapp"],
                  ["emailNewOrg", "Nouvel institut", "email"],
                  ["emailNewUser", "Nouvel utilisateur", "email"],
                  ["emailPaymentFailed", "Échec paiement", "email"],
                  ["emailNewTicket", "Nouveau ticket", "email"],
                ] as const
              ).map(([key, title]) => (
                <div
                  key={key}
                  className="flex flex-col justify-between gap-3 rounded-xl bg-[#FFEFF8] p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-bold text-ink">{title}</p>
                    <p className="text-[11px] text-ink/45">Canal email / interne</p>
                  </div>
                  <Toggle
                    checked={settings.notifications[key]}
                    onChange={(v) =>
                      patchLocal({
                        notifications: {
                          ...settings.notifications,
                          [key]: v,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* 5 WhatsApp */}
          <Section
            id="whatsapp"
            icon={<MessageCircle className="h-5 w-5" />}
            title="5. WhatsApp V1 — mode assisté"
            desc="Préférence manuelle persistée. Auto-send réel = variable d’env."
            active={section === "whatsapp"}
            onVisible={() => setSection("whatsapp")}
          >
            <div className="rounded-2xl bg-ink p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  Mode{" "}
                  {integ?.whatsapp.autoSendEnabled
                    ? "auto-send (env)"
                    : "manuel assisté"}
                </p>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#FFDEA4]">
                  {integ?.whatsapp.mode ?? "manual"}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-white/70">
                Génération de liens <code className="text-[#FFDEA4]">wa.me</code>{" "}
                pour protéger les numéros des salons. Meta Cloud API non requise
                en V1.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 text-[12px]">
                <div className="rounded-lg bg-white/10 p-2">
                  Auto bot :{" "}
                  <strong>
                    {integ?.whatsapp.autoSendEnabled ? "ON" : "OFF"}
                  </strong>
                </div>
                <div className="rounded-lg bg-white/10 p-2">
                  Webhook :{" "}
                  <strong>
                    {integ?.whatsapp.webhookConfigured ? "OK" : "Non"}
                  </strong>
                </div>
                <div className="rounded-lg bg-white/10 p-2">
                  Token :{" "}
                  <strong>
                    {integ?.whatsapp.hasAccessToken ? "Présent" : "Absent"}
                  </strong>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#FFEFF8] p-4">
              <div>
                <p className="font-bold text-ink">Préférer envoi manuel</p>
                <p className="text-[12px] text-ink/50">
                  Flag PlatformConfig (runtime WA = env)
                </p>
              </div>
              <Toggle
                checked={settings.whatsapp.preferManualSend}
                onChange={(v) =>
                  patchLocal({
                    whatsapp: { ...settings.whatsapp, preferManualSend: v },
                  })
                }
              />
            </div>
          </Section>

          {/* 6 Security */}
          <Section
            id="security"
            icon={<Shield className="h-5 w-5" />}
            title="6. Sécurité Root"
            desc="Politiques persistées + profil superviseur."
            active={section === "security"}
            onVisible={() => setSection("security")}
          >
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Prénom">
                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Nom">
                <input
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Email compte">
                <input
                  className={inputClass}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Téléphone">
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            <div className="space-y-2">
              {(
                [
                  ["secureSession", "Sessions sécurisées"],
                  ["forceTempPasswordChange", "Forcer changement MDP temporaire"],
                  ["sessionExpiry", "Expiration de session"],
                  ["bruteForceProtection", "Protection brute force"],
                  ["twoFactorEnabled", "2FA Super Admin (flag)"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3"
                >
                  <span className="text-[13px] font-bold text-ink">{label}</span>
                  <Toggle
                    checked={settings.security[key]}
                    onChange={(v) =>
                      patchLocal({
                        security: { ...settings.security, [key]: v },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#FFEFF8] p-4 md:grid-cols-2">
              <Field label="Mot de passe actuel">
                <input
                  className={inputClass}
                  type="password"
                  value={curPwd}
                  onChange={(e) => setCurPwd(e.target.value)}
                />
              </Field>
              <Field label="Nouveau mot de passe">
                <input
                  className={inputClass}
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </Field>
              <button
                type="button"
                onClick={() => void savePassword()}
                className="md:col-span-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white"
              >
                Mettre à jour le mot de passe
              </button>
            </div>
          </Section>

          {/* 7 Storage soft */}
          <Section
            id="storage"
            icon={<Cloud className="h-5 w-5" />}
            title="7. Stockage R2 (soft)"
            desc="Quotas et bucket — affichage soft, pas d’API admin."
            active={section === "storage"}
            onVisible={() => setSection("storage")}
          >
            <div className="rounded-xl bg-[#FFEFF8] p-4">
              <div className="flex justify-between text-[13px]">
                <span className="font-bold text-ink">Capacité globale</span>
                <span className="font-bold text-primary">Non mesurée</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
                <div className="h-full w-[2%] rounded-full bg-primary" />
              </div>
              <p className="mt-2 text-[11px] text-ink/45">
                Soft-degrade — brancher métriques R2 plus tard
              </p>
            </div>
          </Section>

          {/* 8 Infra */}
          <Section
            id="infra"
            icon={<Cpu className="h-5 w-5" />}
            title="8. Système & infrastructure"
            desc="Liens d’observabilité et snapshots."
            active={section === "infra"}
            onVisible={() => setSection("infra")}
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="Instituts" value={String(snap?.orgs ?? "—")} />
              <Stat label="Users" value={String(snap?.users ?? "—")} />
              <Stat
                label="MRR"
                value={
                  snap?.mrr != null
                    ? `${Math.round(snap.mrr).toLocaleString("fr-MA")} DH`
                    : "—"
                }
              />
              <Stat label="Tickets ouverts" value={String(snap?.openTickets ?? "—")} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={adminHref("/system/health/")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[12px] font-bold text-ink"
              >
                Santé système
              </Link>
              <Link
                href={adminHref("/system/logs/")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[12px] font-bold text-ink"
              >
                Activité &amp; logs
              </Link>
              <Link
                href={adminHref("/audit/")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2 text-[12px] font-bold text-ink"
              >
                Journal d&apos;audit
              </Link>
            </div>
          </Section>

          {/* 9 Appearance soft */}
          <Section
            id="appearance"
            icon={<Brush className="h-5 w-5" />}
            title="9. Marque blanche"
            desc="Charte visuelle héritée (soft UI)."
            active={section === "appearance"}
            onVisible={() => setSection("appearance")}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ColorCard name="Rose Magenta" hex="#E31C5F" swatch="bg-primary" />
              <ColorCard name="Or Royal" hex="#C79A3B" swatch="bg-[#C79A3B]" />
              <ColorCard name="Blanc poudré" hex="#FFF7F9" swatch="bg-[#FFF7F9] border" />
            </div>
            <div className="mt-4">
              <Field label="Mention légale pied de page (soft)">
                <input
                  className={inputClass}
                  value={footerLegal}
                  onChange={(e) => {
                    setFooterLegal(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
          </Section>

          {/* 10 Advanced */}
          <Section
            id="advanced"
            icon={<Lock className="h-5 w-5" />}
            title="10. Zone critique"
            desc="Feature flags AI & actions d’urgence (soft / OTP)."
            active={section === "advanced"}
            danger
            onVisible={() => setSection("advanced")}
          >
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#FFEFF8] p-3 text-[12px] text-ink/60">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#7B5900]" />
              Modifications sensibles — OTP ROOT non branché (soft). Flags AI
              persistés dans PlatformConfig.
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {(
                [
                  ["marketing", "Marketing IA"],
                  ["generation", "Génération IA"],
                  ["suggestions", "Suggestions IA"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3"
                >
                  <span className="text-[12px] font-bold text-ink">{label}</span>
                  <Toggle
                    checked={settings.ai[key]}
                    onChange={(v) =>
                      patchLocal({ ai: { ...settings.ai, [key]: v } })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setToast("Purge Redis : soft — non exposée")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2.5 text-[12px] font-bold text-ink"
              >
                <RefreshCw className="h-4 w-4 text-[#7B5900]" />
                Vider cache Redis
              </button>
              <button
                type="button"
                onClick={() => setToast("Purge BullMQ : soft — non exposée")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFEFF8] px-3 py-2.5 text-[12px] font-bold text-ink"
              >
                Purger files BullMQ
              </button>
              <button
                type="button"
                onClick={() => setToast("Backup immédiat : soft — non branché")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-[12px] font-bold text-white"
              >
                <Sparkles className="h-4 w-4" />
                Backup PostgreSQL
              </button>
            </div>
          </Section>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 text-[#FFDEA4]" />
          <div>
            <p className="text-sm font-bold">{toast}</p>
            <p className="text-[11px] text-white/60">Cluster Casa-01</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  desc,
  children,
  danger,
}: {
  id: SectionId;
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
  active?: boolean;
  danger?: boolean;
  onVisible?: () => void;
}) {
  return (
    <section
      id={`sec-${id}`}
      className={cn(
        "scroll-mt-36 space-y-4 rounded-2xl bg-white p-5 shadow-sm lg:p-6",
        danger && "border-2 border-primary/20",
      )}
    >
      <div className="flex items-start gap-3 border-b border-[#FFEFF8] pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8] text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-[13px] text-ink/50">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Metric({
  icon,
  label,
  title,
  hint,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
          {label}
        </p>
        <p className="truncate font-bold text-ink">{title}</p>
        <p className="truncate text-[11px] text-ink/50">{hint}</p>
      </div>
    </div>
  );
}

function Tone({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        ok ? "bg-emerald-50 text-emerald-700" : "bg-[#FFDEA4]/50 text-[#5D4200]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ok ? "bg-emerald-600" : "bg-[#7B5900]",
        )}
      />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FFEFF8] p-3">
      <p className="text-[10px] font-bold uppercase text-ink/40">{label}</p>
      <p className="text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function ColorCard({
  name,
  hex,
  swatch,
}: {
  name: string;
  hex: string;
  swatch: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] p-3">
      <div className={cn("h-12 w-12 shrink-0 rounded-lg shadow-sm", swatch)} />
      <div>
        <p className="font-bold text-ink">{name}</p>
        <p className="font-mono text-[11px] text-ink/45">{hex}</p>
      </div>
    </div>
  );
}
