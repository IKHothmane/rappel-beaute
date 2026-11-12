"use client";

import { CalendarDays, Check, ChevronDown, Clock3, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function isoToFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function frToIso(fr: string): string | null {
  const match = fr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** `YYYY-MM-DDTHH:mm` → `JJ/MM/AAAA HH:MM` */
function datetimeLocalToFr(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
}

/** `JJ/MM/AAAA HH:MM` → `YYYY-MM-DDTHH:mm` */
function frToDatetimeLocal(fr: string): string | null {
  const match = fr
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!match) return null;
  const iso = frToIso(`${match[1]}/${match[2]}/${match[3]}`);
  if (!iso) return null;
  const hour = match[4] != null ? Number(match[4]) : 9;
  const minute = match[5] != null ? Number(match[5]) : 0;
  if (hour > 23 || minute > 59) return null;
  return `${iso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDatetimeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const h = digits.slice(8, 10);
  const min = digits.slice(10, 12);
  let out = d;
  if (m) out += `/${m}`;
  if (y) out += `/${y}`;
  if (h) out += ` ${h}`;
  if (min) out += `:${min}`;
  return out;
}

const fieldClass =
  "h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none transition focus:border-[#B60050]";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#887787]";

type Option = { value: string; label: string; hint?: string };

export function PremiumListSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Choisir…",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <span className={labelClass}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          fieldClass,
          "flex items-center gap-2.5 text-left",
          open && "border-[#B60050]",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F8F0F4] text-[#75133D]">
          <UserRound size={14} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="block truncate font-medium text-[#261524]">{selected.label}</span>
              {selected.hint ? (
                <span className="block truncate text-[11px] text-[#887787]">{selected.hint}</span>
              ) : null}
            </>
          ) : (
            <span className="text-[#887787]">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-[#887787]", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white p-1.5 shadow-lg"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#887787]">Aucune option</p>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left",
                    isSelected ? "bg-[#FCE7F1]" : "hover:bg-[#FFF1F6]",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F0F4] text-[11px] font-bold text-[#75133D]">
                    {opt.label
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")
                      .toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isSelected ? "font-semibold text-[#75133D]" : "font-medium text-[#261524]",
                      )}
                    >
                      {opt.label}
                    </span>
                    {opt.hint ? (
                      <span className="block truncate text-xs text-[#887787]">{opt.hint}</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check size={16} className="shrink-0 text-[#B60050]" aria-hidden /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Date : saisie JJ/MM/AAAA + calendrier. */
export function DualDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [text, setText] = useState(() => (value ? isoToFr(value) : ""));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value ? isoToFr(value) : "");
  }, [value]);

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="JJ/MM/AAAA"
          maxLength={10}
          value={text}
          onChange={(e) => {
            const formatted = formatDateDigits(e.target.value);
            setText(formatted);
            const iso = frToIso(formatted);
            if (iso) onChange(iso);
            else if (formatted.length === 10) onChange("");
          }}
          className={cn(fieldClass, "min-w-0 flex-1 font-mono")}
        />
        <button
          type="button"
          aria-label="Ouvrir le calendrier"
          onClick={() => {
            const el = pickerRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.click();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8D4DE] bg-white text-[#75133D] transition hover:bg-[#FFF1F6]"
        >
          <CalendarDays size={18} aria-hidden />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setText(e.target.value ? isoToFr(e.target.value) : "");
          }}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

/** Date + heure : saisie JJ/MM/AAAA HH:MM + sélecteur natif. */
export function DualDateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (local: string) => void;
}) {
  const [text, setText] = useState(() => (value ? datetimeLocalToFr(value) : ""));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value ? datetimeLocalToFr(value) : "");
  }, [value]);

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="JJ/MM/AAAA HH:MM"
          maxLength={16}
          value={text}
          onChange={(e) => {
            const formatted = formatDatetimeDigits(e.target.value);
            setText(formatted);
            const local = frToDatetimeLocal(formatted);
            if (local) onChange(local);
            else if (formatted.replace(/\D/g, "").length >= 12) onChange("");
          }}
          className={cn(fieldClass, "min-w-0 flex-1 font-mono")}
        />
        <button
          type="button"
          aria-label="Ouvrir le calendrier"
          onClick={() => {
            const el = pickerRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.click();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8D4DE] bg-white text-[#75133D] transition hover:bg-[#FFF1F6]"
        >
          <Clock3 size={18} aria-hidden />
        </button>
        <input
          ref={pickerRef}
          type="datetime-local"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setText(e.target.value ? datetimeLocalToFr(e.target.value) : "");
          }}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

export function LimitedTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength: number;
  optional?: boolean;
}) {
  return (
    <div>
      <span className={labelClass}>
        {label}
        {optional ? <span className="ml-1 font-normal normal-case tracking-normal">(optionnel)</span> : null}
      </span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
      <p className="mt-1 text-right text-[11px] text-[#A08A97]">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
