"use client";

import { Loader2, Plus } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import {
  CATEGORY_LABEL,
  PROSPECT_CATEGORIES,
  ProspectsApiError,
  createProspect,
  isPlausibleEmail,
  safeWebsiteHref,
  type CreateProspectInput,
  type Prospect,
  type ProspectCategory,
} from "@/lib/admin/prospects-client";
import { btnPrimary, btnSecondary, fieldCls } from "./prospect-styles";

type FieldName = "name" | "category" | "city" | "address" | "phone" | "email" | "website";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = { name: "", category: "beauty", city: "", address: "", phone: "", email: "", website: "" };
const FIELD_ORDER: FieldName[] = ["name", "category", "city", "address", "phone", "email", "website"];
const FORM_ID = "prospect-create-form";

/** Validation côté navigateur ; le serveur reste l'arbitre (fieldErrors renvoyés en 400). */
export function validateProspectForm(values: Values): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Le nom est obligatoire.";
  else if (name.length > 200) errors.name = "200 caractères maximum.";
  if (!(PROSPECT_CATEGORIES as readonly string[]).includes(values.category)) errors.category = "Choisissez une catégorie.";
  if (values.city.trim().length > 120) errors.city = "120 caractères maximum.";
  if (values.address.trim().length > 300) errors.address = "300 caractères maximum.";
  const phone = values.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (/[^\d\s+().-]/.test(phone) || digits.length < 9 || digits.length > 15) {
      errors.phone = "Numéro invalide (ex. 06 12 34 56 78 ou +212 6 12 34 56 78).";
    }
  }
  if (values.email.trim() && !isPlausibleEmail(values.email)) errors.email = "Adresse e-mail invalide.";
  if (values.website.trim() && !safeWebsiteHref(values.website)) errors.website = "Adresse de site invalide (ex. salon-exemple.ma).";
  return errors;
}

export function ProspectCreatePanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (item: Prospect) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <PremiumSidePanel
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Ajouter un prospect"
      description="Saisie manuelle d'un institut ou salon à démarcher."
      size="md"
      // Pleine largeur sur téléphone : 100vw seul ne couvre que 80 % de l'écran sous html { zoom: 0.8 }.
      className="max-sm:w-[calc(100vw/0.8)]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" form={FORM_ID} className={btnPrimary} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            {busy ? "Ajout…" : "Ajouter le prospect"}
          </button>
        </div>
      }
    >
      {open ? <CreateForm onBusy={setBusy} onCreated={onCreated} /> : null}
    </PremiumSidePanel>
  );
}

function CreateForm({ onBusy, onCreated }: { onBusy: (busy: boolean) => void; onCreated: (item: Prospect) => void }) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const id = (f: FieldName) => `${uid}-${f}`;
  const set = (f: FieldName, v: string) => {
    setValues((prev) => ({ ...prev, [f]: v }));
    if (errors[f]) setErrors((prev) => ({ ...prev, [f]: undefined }));
  };

  function focusFirstError(errs: Errors) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(first))}`)?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    const errs = validateProspectForm(values);
    setErrors(errs);
    setFormError(null);
    if (Object.values(errs).some(Boolean)) {
      focusFirstError(errs);
      return;
    }
    const input: CreateProspectInput = { name: values.name.trim(), category: values.category as ProspectCategory };
    for (const f of ["city", "address", "phone", "email", "website"] as const) {
      const v = values[f].trim();
      if (v) input[f] = v;
    }
    busyRef.current = true;
    onBusy(true);
    try {
      const { item } = await createProspect(input);
      onCreated(item);
    } catch (err) {
      if (err instanceof ProspectsApiError && Object.keys(err.fieldErrors).length) {
        const server: Errors = {};
        const unknown: string[] = [];
        for (const [k, msg] of Object.entries(err.fieldErrors)) {
          if ((FIELD_ORDER as string[]).includes(k)) server[k as FieldName] = msg;
          else unknown.push(msg);
        }
        setErrors(server);
        setFormError(unknown.length ? unknown.join(" ") : err.message);
        focusFirstError(server);
      } else {
        setFormError(err instanceof Error ? err.message : "Ajout impossible.");
      }
    } finally {
      busyRef.current = false;
      onBusy(false);
    }
  }

  function field(f: FieldName, label: string, opts: { required?: boolean; type?: string; autoComplete?: string; placeholder?: string; inputMode?: "tel" | "email" | "url" | "text" } = {}) {
    const err = errors[f];
    return (
      <div>
        <label htmlFor={id(f)} className="mb-1.5 block text-sm font-semibold text-slate-800">
          {label}
          {opts.required ? <span className="text-rose-600"> *</span> : <span className="font-normal text-slate-500"> (facultatif)</span>}
        </label>
        <input
          id={id(f)}
          name={f}
          type={opts.type ?? "text"}
          value={values[f]}
          onChange={(e) => set(f, e.target.value)}
          required={opts.required}
          aria-required={opts.required || undefined}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id(f)}-error` : undefined}
          autoComplete={opts.autoComplete ?? "off"}
          inputMode={opts.inputMode}
          placeholder={opts.placeholder}
          autoFocus={f === "name"}
          className={fieldCls}
        />
        {err ? (
          <p id={`${id(f)}-error`} className="mt-1 text-xs font-medium text-rose-700">
            {err}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      {formError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
          {formError}
        </p>
      ) : null}
      {field("name", "Nom", { required: true, placeholder: "Ex. Salon Exemple" })}
      <div>
        <label htmlFor={id("category")} className="mb-1.5 block text-sm font-semibold text-slate-800">
          Catégorie<span className="text-rose-600"> *</span>
        </label>
        <select
          id={id("category")}
          name="category"
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? `${id("category")}-error` : undefined}
          className={fieldCls}
        >
          {PROSPECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p id={`${id("category")}-error`} className="mt-1 text-xs font-medium text-rose-700">
            {errors.category}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("city", "Ville", { placeholder: "Ex. Casablanca" })}
        {field("phone", "Téléphone", { type: "tel", inputMode: "tel", placeholder: "06 00 00 00 00" })}
      </div>
      {field("address", "Adresse", { placeholder: "Rue, quartier" })}
      {field("email", "E-mail", { type: "email", inputMode: "email", placeholder: "contact@exemple.ma" })}
      {/* type="text" : type="url" refuserait « salon.ma » sans https:// */}
      {field("website", "Site web", { inputMode: "url", placeholder: "salon-exemple.ma" })}
    </form>
  );
}
