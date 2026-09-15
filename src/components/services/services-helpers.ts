import {
  Eye,
  Gift,
  Paintbrush,
  Palette,
  Scissors,
  Sparkles,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120] as const;

export function staffInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function hourlyRate(price: number, durationMin: number): number | null {
  if (!durationMin || durationMin <= 0) return null;
  return Math.round(price / (durationMin / 60));
}

export function categoryIcon(category: string | null): LucideIcon {
  const key = (category ?? "").toLowerCase();
  if (/visage|hydra|peau/.test(key)) return Sparkles;
  if (/cheveu|coiff|color/.test(key)) return Scissors;
  if (/ongle|manucure|main|pied/.test(key)) return Paintbrush;
  if (/maquillage/.test(key)) return Palette;
  if (/corps|hammam|massage|rituel/.test(key)) return Waves;
  if (/cil|regard/.test(key)) return Eye;
  if (/épil|epil|cire/.test(key)) return Zap;
  if (/pack|forfait|cadeau/.test(key)) return Gift;
  return Sparkles;
}
