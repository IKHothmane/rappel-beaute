"use client";

import { Check, Users } from "lucide-react";

type StaffOption = { id: string; name: string };

export function LoyaltyStaffPicker({ options, value, onChange, disabled }: {
  options: StaffOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const members = [...new Map(options.map((member) => [member.id, member])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="text-sm font-semibold text-[#43293A]">Choisissez les membres de l’équipe <span className="font-normal text-[#806B77]">(facultatif)</span></legend>
      <p className="pt-1 text-xs leading-5 text-[#806B77]">Vous pouvez sélectionner plusieurs personnes et noter chacune séparément.</p>
      <div className="flex items-center justify-between gap-2 text-xs text-[#806B77]">
        <span className="flex items-center gap-1.5"><Users size={14} aria-hidden />{members.length} membre{members.length > 1 ? "s" : ""}</span>
        <span aria-live="polite">{value.length} sélectionné{value.length > 1 ? "s" : ""}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {members.map((member) => {
          const selected = value.includes(member.id);
          const initials = member.name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("fr");
          return (
            <label key={member.id} className="relative min-w-0 cursor-pointer">
              <input type="checkbox" checked={selected} onChange={() => onChange(selected ? value.filter((id) => id !== member.id) : [...value, member.id])} aria-label={member.name} className="peer sr-only" />
              <span className={`flex h-full min-h-28 flex-col gap-2 rounded-2xl border p-3 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#A83E70] peer-focus-visible:ring-offset-1 peer-disabled:opacity-50 ${selected ? "border-[#A83E70] bg-[#FCE9F2] shadow-sm" : "border-[#F0DDE7] bg-white hover:border-[#D8A9BF] hover:bg-[#FFFAFC]"}`}>
                <span className="flex w-full items-start justify-between gap-2">
                  <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-[#A83E70] text-white" : "bg-[#FCE9F2] text-[#A83E70]"}`}>{initials}</span>
                  <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-[#A83E70] bg-[#A83E70] text-white" : "border-[#D9BFCB] bg-white"}`}>{selected ? <Check size={13} strokeWidth={3} /> : null}</span>
                </span>
                <span className="break-words text-sm font-semibold leading-5 text-[#43293A]">{member.name}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
