"use client";

import {
  TrendingUp,
  CalendarDays,
  Users,
  Package,
  MessageCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";

type Suggestion = {
  label: string;
  prompt: string;
  icon: LucideIcon;
};

const suggestions: Suggestion[] = [
  {
    label: "Analyser mes ventes",
    prompt: "Analyse mes ventes du mois.",
    icon: TrendingUp,
  },
  {
    label: "Optimiser le planning",
    prompt: "Comment optimiser mon planning ?",
    icon: CalendarDays,
  },
  {
    label: "Clientes à relancer",
    prompt: "Quelles clientes devrais-je relancer ?",
    icon: Users,
  },
  {
    label: "Vérifier le stock",
    prompt: "Quels produits nécessitent un réapprovisionnement ?",
    icon: Package,
  },
  {
    label: "Campagne WhatsApp",
    prompt: "Propose une campagne WhatsApp sans envoyer de messages.",
    icon: MessageCircle,
  },
  {
    label: "Rapport de gestion",
    prompt: "Prépare un rapport de gestion de mon institut.",
    icon: FileText,
  },
];

type Props = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function AssistantSuggestions({
  onSelect,
  disabled = false,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[#371626]">
        <span className="text-[#C01D60]">✦</span>
        Comment puis-je vous aider ?
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {suggestions.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              className="group flex min-h-[88px] items-center gap-4 rounded-2xl border border-[#F1DCE6] bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#E7A8C4] hover:bg-[#FFF8FB] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FCE8F1] text-[#B8195A] transition group-hover:bg-[#B8195A] group-hover:text-white">
                <Icon size={22} />
              </div>

              <span className="text-sm font-bold text-[#371626]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
