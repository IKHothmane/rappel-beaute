"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { AIMessageComposer } from "@/components/ai/ai-message-composer";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canSendWhatsapp, canWriteFeatureLimited, canWriteWhatsappTemplates } from "@/lib/rbac";
import {
  createWhatsAppTemplate,
  formatAppointmentWhen,
  formatMad,
  getWhatsAppDashboard,
  listWhatsAppTemplates,
  markWhatsAppSent,
  recordWhatsAppOutcome,
  sendDirectWhatsApp,
  skipWhatsAppTask,
  updateWhatsAppTemplate,
  WHATSAPP_OUTCOME_LABEL,
  WHATSAPP_TASK_TYPE_LABEL,
  WHATSAPP_TEMPLATE_VARIABLES,
} from "@/modules/whatsapp/service";
import type {
  WhatsAppKpis,
  WhatsAppStaffOutcome,
  WhatsAppTaskItem,
  WhatsAppTaskType,
  WhatsAppTemplateItem,
} from "@/types/whatsapp";
import { WHATSAPP_TASK_TYPES } from "@/types/whatsapp";

function typeBadgeClass(type: WhatsAppTaskType): string {
  if (type.includes("REMINDER") || type.includes("CONFIRMATION")) return "text-red-600";
  if (type === "REVIEW_REQUEST") return "text-violet-600";
  if (type === "REACTIVATION" || type === "BIRTHDAY") return "text-amber-600";
  return "text-ink/60";
}

export function WhatsappPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canSend = canSendWhatsapp(user.role);
  const canEditTemplates = canWriteWhatsappTemplates(user.role);
  const canGenerateAi = canWriteFeatureLimited(user.role, "ai");

  const [tab, setTab] = useState("À envoyer");
  const [view, setView] = useState<"pending" | "sent">("pending");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WhatsAppTaskItem[]>([]);
  const [kpis, setKpis] = useState<WhatsAppKpis | null>(null);
  const [preview, setPreview] = useState<WhatsAppTaskItem | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplateItem[]>([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<WhatsAppTemplateItem | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplType, setTplType] = useState<WhatsAppTaskType>("APPOINTMENT_REMINDER");
  const [tplBody, setTplBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    configured: boolean;
    phoneNumberId: string | null;
    maskedToken: string | null;
    verdict: string;
    phoneCheck: {
      ok: boolean;
      data?: Record<string, unknown>;
      error?: string;
    };
    nextSteps: string[];
  } | null>(null);

  async function runDiagnostic() {
    setDiagOpen(true);
    setDiagLoading(true);
    try {
      const res = await fetch("/api/whatsapp/diagnostics/", { credentials: "include" });
      const data = await res.json();
      setDiagResult(data);
    } catch {
      toast("Impossible de contacter l'API de diagnostic.", "error");
    } finally {
      setDiagLoading(false);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const currentView = tab === "Envoyés" ? "sent" : "pending";
      setView(currentView);
      const res = await getWhatsAppDashboard(currentView);
      setTasks(res.items ?? []);
      setKpis(res.kpis ?? null);
      if (canEditTemplates) {
        const tpls = await listWhatsAppTemplates();
        setTemplates(tpls ?? []);
      }
    } catch {
      toast("Impossible de charger WhatsApp.", "error");
    }
  }, [tab, canEditTemplates, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleMarkSent(task: WhatsAppTaskItem) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await markWhatsAppSent(task.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Marqué comme envoyé.", "success");
    setPreview(null);
    refresh();
  }

  async function handleDirectSend(taskId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await sendDirectWhatsApp(taskId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("🚀 Message envoyé directement au client via WhatsApp !", "success");
    setPreview(null);
    refresh();
  }

  async function handleSkip(taskId: string) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await skipWhatsAppTask(taskId);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Tâche ignorée.", "success");
    setPreview(null);
    refresh();
  }

  async function handleOutcome(taskId: string, outcome: WhatsAppStaffOutcome) {
    if (!canSend) return;
    setSubmitting(true);
    const result = await recordWhatsAppOutcome(taskId, outcome);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${WHATSAPP_OUTCOME_LABEL[outcome]} enregistrée.`, "success");
    refresh();
  }

  function openCreateTemplate() {
    setEditingTpl(null);
    setTplName("");
    setTplType("APPOINTMENT_REMINDER");
    setTplBody("");
    setTplOpen(true);
  }

  function openEditTemplate(tpl: WhatsAppTemplateItem) {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplType(tpl.type);
    setTplBody(tpl.body);
    setTplOpen(true);
  }

  async function handleSaveTemplate() {
    setSubmitting(true);
    const result = editingTpl
      ? await updateWhatsAppTemplate({ id: editingTpl.id, name: tplName, body: tplBody })
      : await createWhatsAppTemplate({ name: tplName, type: tplType, body: tplBody });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(editingTpl ? "Modèle mis à jour." : "Modèle créé.", "success");
    setTplOpen(false);
    refresh();
  }

  const tabs = [
    "À envoyer",
    "Envoyés",
    ...(canGenerateAi ? ["Générer IA"] : []),
    ...(canEditTemplates ? ["Modèles"] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="WhatsApp"
        description="Manuel assisté V1 — ouverture wa.me, aucun statut lu / livré / répondu."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runDiagnostic()}
              className="text-xs"
            >
              🔍 Tester connexion Meta
            </Button>
            {canEditTemplates && tab === "Modèles" ? (
              <Button onClick={openCreateTemplate}>Nouveau modèle</Button>
            ) : null}
          </div>
        }
      />

      {kpis ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="À envoyer aujourd'hui" value={String(kpis.pendingToday)} />
          <Kpi label="Envoyés" value={String(kpis.sentToday)} hint="Marqués manuellement" />
          <Kpi
            label="Confirmations enregistrées"
            value={String(kpis.confirmationsRecorded)}
            hint="Saisie personnel"
          />
          <Kpi label="Annulations" value={String(kpis.cancellationsRecorded)} hint="Saisie personnel" />
          <Kpi label="Relances" value={String(kpis.followUpsRecorded)} hint="Saisie personnel" />
        </div>
      ) : null}

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {loading && tab !== "Générer IA" ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : tab === "Générer IA" ? (
        <div className="surface p-5">
          <AIMessageComposer
            onTaskCreated={() => {
              setTab("À envoyer");
              refresh();
            }}
          />
        </div>
      ) : tab === "Modèles" ? (
        <ul className="space-y-3">
          {(templates ?? []).map((tpl) => (
            <li key={tpl.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className={`mt-1 text-xs font-mono uppercase ${typeBadgeClass(tpl.type)}`}>
                    {WHATSAPP_TASK_TYPE_LABEL[tpl.type]}
                    {tpl.isDefault ? " · défaut" : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEditTemplate(tpl)}>
                  Modifier
                </Button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-ink/[0.03] p-3 text-sm text-ink/70">
                {tpl.body}
              </pre>
            </li>
          ))}
        </ul>
      ) : (tasks ?? []).length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          {view === "pending"
            ? "Aucun message à envoyer pour le moment."
            : "Aucun message envoyé récemment."}
        </div>
      ) : (
        <ul className="space-y-3">
          {(tasks ?? []).map((task) => (
            <li key={task.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={`text-xs font-mono uppercase tracking-wide ${typeBadgeClass(task.type)}`}>
                  {WHATSAPP_TASK_TYPE_LABEL[task.type]}
                  {task.attributionSource === "ai_marketing" ? " · IA" : ""}
                </p>
                <span className="text-xs text-ink/45">
                  {task.status === "SENT" && task.sentAt
                    ? `Envoyé ${new Date(task.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                    : "À envoyer"}
                </span>
              </div>

              <p className="mt-2 text-lg font-medium">{task.customerName}</p>

              {task.appointmentStartAt ? (
                <p className="text-sm text-ink/60">
                  {formatAppointmentWhen(task.appointmentStartAt)}
                  {task.serviceName ? (
                    <>
                      {" · "}
                      {task.serviceName}
                      {task.servicePrice != null ? ` — ${formatMad(task.servicePrice)}` : ""}
                    </>
                  ) : null}
                </p>
              ) : null}

              <p className="mt-2 line-clamp-2 text-sm text-ink/55">{task.messageSnapshot}</p>

              {task.staffOutcome ? (
                <p className="mt-2 text-xs text-ink/45">
                  Réponse enregistrée : {WHATSAPP_OUTCOME_LABEL[task.staffOutcome]}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/customers/${task.customerId}`} className="btn-ghost">
                  Voir cliente
                </Link>
                <button type="button" className="btn-ghost" onClick={() => setPreview(task)}>
                  Prévisualiser
                </button>
                {canSend && task.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      disabled={submitting}
                      onClick={() => handleDirectSend(task.id)}
                    >
                      🚀 Envoyer direct
                    </button>
                    <a
                      href={task.waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost text-xs"
                      title="Ouvrir manuellement sur WhatsApp Web"
                    >
                      Ouvrir wa.me
                    </a>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={submitting}
                      onClick={() => handleSkip(task.id)}
                    >
                      Ignorer
                    </button>
                  </>
                ) : null}
                {canSend && task.status === "SENT" && !task.staffOutcome ? (
                  <>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={submitting}
                      onClick={() => handleOutcome(task.id, "CUSTOMER_CONFIRMED")}
                    >
                      ✓ Confirmée
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={submitting}
                      onClick={() => handleOutcome(task.id, "CUSTOMER_CANCELLED")}
                    >
                      Annulée
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={submitting}
                      onClick={() => handleOutcome(task.id, "NEEDS_FOLLOWUP")}
                    >
                      Relance
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Message préparé"
      >
        {preview ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/50">
              {preview.customerName} · {preview.phoneSnapshot}
            </p>
            <pre className="whitespace-pre-wrap rounded-xl bg-ink/[0.03] p-4 text-sm leading-relaxed">
              {preview.messageSnapshot}
            </pre>
            <p className="text-xs text-ink/40">
              Le message est figé à la création de la tâche — modifier un modèle n&apos;affecte pas
              les tâches existantes.
            </p>
            {canSend ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {preview.status === "PENDING" ? (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={submitting}
                    onClick={() => handleDirectSend(preview.id)}
                  >
                    🚀 Envoyer directement au client
                  </Button>
                ) : null}
                <a
                  href={preview.waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-center text-xs"
                >
                  Ouvrir wa.me (secours)
                </a>
                {preview.status === "PENDING" ? (
                  <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => handleMarkSent(preview)}
                  >
                    ✓ Marquer comme envoyé
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={tplOpen}
        onClose={() => setTplOpen(false)}
        title={editingTpl ? "Modifier le modèle" : "Nouveau modèle"}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">Nom</span>
            <Input value={tplName} onChange={(e) => setTplName(e.target.value)} />
          </label>
          {!editingTpl ? (
            <label className="block">
              <span className="mb-1 block text-xs text-ink/50">Type</span>
              <Select value={tplType} onChange={(e) => setTplType(e.target.value as WhatsAppTaskType)}>
                {WHATSAPP_TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WHATSAPP_TASK_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-ink/50">Corps du message</span>
            <textarea
              className="input min-h-[180px] w-full font-mono text-sm"
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
            />
          </label>
          <p className="text-xs text-ink/40">
            Variables : {WHATSAPP_TEMPLATE_VARIABLES.join(", ")}
          </p>
          <Button disabled={submitting || !tplName.trim() || !tplBody.trim()} onClick={handleSaveTemplate}>
            Enregistrer
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        title="Diagnostic Meta WhatsApp Cloud API"
      >
        <div className="space-y-4">
          {diagLoading ? (
            <div className="py-8 text-center text-sm text-ink/60">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Vérification en temps réel auprès des serveurs Meta...
            </div>
          ) : diagResult ? (
            <>
              <div
                className={`rounded-xl p-4 text-sm ${
                  diagResult.phoneCheck?.ok
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <p className="font-semibold">{diagResult.verdict}</p>
                {diagResult.phoneCheck?.data?.display_phone_number ? (
                  <p className="mt-2 text-xs">
                    📱 Numéro reconnu par Meta :{" "}
                    <strong>{String(diagResult.phoneCheck.data.display_phone_number)}</strong>
                    {diagResult.phoneCheck.data.verified_name
                      ? ` (${String(diagResult.phoneCheck.data.verified_name)})`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-ink/10 bg-surface p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink/60">ID Numéro (WHATSAPP_PHONE_NUMBER_ID) :</span>
                  <span className="font-mono font-medium">{diagResult.phoneNumberId || "Non configuré"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Jeton d'accès (WHATSAPP_ACCESS_TOKEN) :</span>
                  <span className="font-mono font-medium">{diagResult.maskedToken || "Non configuré"}</span>
                </div>
                {diagResult.phoneCheck?.error ? (
                  <div className="mt-3 border-t border-ink/10 pt-2">
                    <span className="text-red-600 font-semibold block mb-1">Réponse exacte reçue de Meta :</span>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] bg-red-50 text-red-700 p-2 rounded">
                      {diagResult.phoneCheck.error}
                    </pre>
                  </div>
                ) : null}
              </div>

              {diagResult.nextSteps && diagResult.nextSteps.length > 0 ? (
                <div className="rounded-xl bg-ink/[0.03] p-4 text-xs space-y-2">
                  <p className="font-semibold text-ink/80">Procédure de résolution :</p>
                  <ul className="list-disc pl-4 space-y-1 text-ink/70">
                    {diagResult.nextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="pt-2">
                <Button variant="secondary" className="w-full" onClick={() => void runDiagnostic()}>
                  🔄 Relancer la vérification
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Drawer>
    </motion.div>
  );
}
