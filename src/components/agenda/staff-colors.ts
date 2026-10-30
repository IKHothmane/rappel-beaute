export type StaffColor = {
  name: string;
  bar: string;
  text: string;
  soft: string;
  ring: string;
  /** Fond du bloc rendez-vous dans l'agenda. */
  fill: string;
  border: string;
};

/** Une couleur par employée, dans l'ordre de la liste. */
export const STAFF_COLOR_LIST: StaffColor[] = [
  { name: "Rose", bar: "bg-primary", text: "text-primary", soft: "bg-primary/10", ring: "ring-primary/25", fill: "bg-[#F8C9D8]", border: "border-[#E31C5F]/40" },
  { name: "Or", bar: "bg-gold", text: "text-gold", soft: "bg-[#FFF1D6]", ring: "ring-gold/30", fill: "bg-[#F6E3B0]", border: "border-[#C79A3B]/55" },
  { name: "Violet", bar: "bg-violet-600", text: "text-violet-700", soft: "bg-violet-50", ring: "ring-violet-200", fill: "bg-violet-200", border: "border-violet-400" },
  { name: "Ciel", bar: "bg-sky-600", text: "text-sky-700", soft: "bg-sky-50", ring: "ring-sky-200", fill: "bg-sky-200", border: "border-sky-400" },
  { name: "Émeraude", bar: "bg-emerald-600", text: "text-emerald-700", soft: "bg-emerald-50", ring: "ring-emerald-200", fill: "bg-emerald-200", border: "border-emerald-400" },
  { name: "Corail", bar: "bg-orange-600", text: "text-orange-700", soft: "bg-orange-50", ring: "ring-orange-200", fill: "bg-orange-200", border: "border-orange-400" },
  { name: "Indigo", bar: "bg-indigo-600", text: "text-indigo-700", soft: "bg-indigo-50", ring: "ring-indigo-200", fill: "bg-indigo-200", border: "border-indigo-400" },
  { name: "Fuchsia", bar: "bg-fuchsia-600", text: "text-fuchsia-700", soft: "bg-fuchsia-50", ring: "ring-fuchsia-200", fill: "bg-fuchsia-200", border: "border-fuchsia-400" },
  { name: "Turquoise", bar: "bg-teal-600", text: "text-teal-700", soft: "bg-teal-50", ring: "ring-teal-200", fill: "bg-teal-200", border: "border-teal-400" },
  { name: "Ambre", bar: "bg-amber-600", text: "text-amber-800", soft: "bg-amber-50", ring: "ring-amber-200", fill: "bg-amber-200", border: "border-amber-400" },
  { name: "Bleu", bar: "bg-blue-600", text: "text-blue-700", soft: "bg-blue-50", ring: "ring-blue-200", fill: "bg-blue-200", border: "border-blue-400" },
  { name: "Lime", bar: "bg-lime-600", text: "text-lime-800", soft: "bg-lime-50", ring: "ring-lime-200", fill: "bg-lime-200", border: "border-lime-400" },
];

/** Annulé et no-show restent gris pour ne pas se confondre avec une praticienne. */
export function agendaAppointmentSurface(color: StaffColor, muted: boolean) {
  if (muted) return { fill: "bg-gray-100", border: "border-gray-300", bar: "bg-gray-400" };
  return { fill: color.fill, border: color.border, bar: color.bar };
}

export function assignStaffColors(ids: string[]): Map<string, StaffColor> {
  const map = new Map<string, StaffColor>();
  [...ids].sort().forEach((id, index) => {
    map.set(id, STAFF_COLOR_LIST[index % STAFF_COLOR_LIST.length]);
  });
  return map;
}

export function staffColor(staffId: string | null | undefined, assigned?: Map<string, StaffColor>) {
  if (assigned) {
    if (staffId && assigned.has(staffId)) return assigned.get(staffId)!;
    return STAFF_COLOR_LIST[0];
  }
  const id = staffId ?? "";
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % STAFF_COLOR_LIST.length;
  return STAFF_COLOR_LIST[hash] ?? STAFF_COLOR_LIST[0];
}
