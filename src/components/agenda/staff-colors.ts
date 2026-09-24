const PALETTE = [
  { bar: "bg-primary", text: "text-primary", soft: "bg-primary/10", ring: "ring-primary/25" },
  { bar: "bg-gold", text: "text-gold", soft: "bg-[#FFF1D6]", ring: "ring-gold/30" },
  { bar: "bg-violet-600", text: "text-violet-700", soft: "bg-violet-50", ring: "ring-violet-200" },
  { bar: "bg-sky-600", text: "text-sky-700", soft: "bg-sky-50", ring: "ring-sky-200" },
  { bar: "bg-emerald-600", text: "text-emerald-700", soft: "bg-emerald-50", ring: "ring-emerald-200" },
  { bar: "bg-rose-600", text: "text-rose-700", soft: "bg-rose-50", ring: "ring-rose-200" },
] as const;

export function staffColor(staffId: string | null | undefined) {
  const id = staffId ?? "";
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[hash] ?? PALETTE[0];
}
