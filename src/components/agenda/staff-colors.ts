export type StaffColor = {
  name: string;
  bar: string;
  text: string;
  soft: string;
  ring: string;
};

/** Une couleur par employée, dans l'ordre de la liste. */
export const STAFF_COLOR_LIST: StaffColor[] = [
  { name: "Rose", bar: "bg-primary", text: "text-primary", soft: "bg-primary/10", ring: "ring-primary/25" },
  { name: "Or", bar: "bg-gold", text: "text-gold", soft: "bg-[#FFF1D6]", ring: "ring-gold/30" },
  { name: "Violet", bar: "bg-violet-600", text: "text-violet-700", soft: "bg-violet-50", ring: "ring-violet-200" },
  { name: "Ciel", bar: "bg-sky-600", text: "text-sky-700", soft: "bg-sky-50", ring: "ring-sky-200" },
  { name: "Émeraude", bar: "bg-emerald-600", text: "text-emerald-700", soft: "bg-emerald-50", ring: "ring-emerald-200" },
  { name: "Corail", bar: "bg-orange-600", text: "text-orange-700", soft: "bg-orange-50", ring: "ring-orange-200" },
  { name: "Indigo", bar: "bg-indigo-600", text: "text-indigo-700", soft: "bg-indigo-50", ring: "ring-indigo-200" },
  { name: "Fuchsia", bar: "bg-fuchsia-600", text: "text-fuchsia-700", soft: "bg-fuchsia-50", ring: "ring-fuchsia-200" },
  { name: "Turquoise", bar: "bg-teal-600", text: "text-teal-700", soft: "bg-teal-50", ring: "ring-teal-200" },
  { name: "Ambre", bar: "bg-amber-600", text: "text-amber-800", soft: "bg-amber-50", ring: "ring-amber-200" },
  { name: "Bleu", bar: "bg-blue-600", text: "text-blue-700", soft: "bg-blue-50", ring: "ring-blue-200" },
  { name: "Lime", bar: "bg-lime-600", text: "text-lime-800", soft: "bg-lime-50", ring: "ring-lime-200" },
];

export function assignStaffColors(ids: string[]): Map<string, StaffColor> {
  const map = new Map<string, StaffColor>();
  [...ids].sort().forEach((id, index) => {
    map.set(id, STAFF_COLOR_LIST[index % STAFF_COLOR_LIST.length]);
  });
  return map;
}

export function staffColor(staffId: string | null | undefined, assigned?: Map<string, StaffColor>) {
  if (staffId && assigned?.has(staffId)) return assigned.get(staffId)!;
  const id = staffId ?? "";
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % STAFF_COLOR_LIST.length;
  return STAFF_COLOR_LIST[hash] ?? STAFF_COLOR_LIST[0];
}
