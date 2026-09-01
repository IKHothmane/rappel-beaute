"use client";

import { cn } from "@/lib/utils";

type TabsProps = {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-line bg-[#FBF4F6] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
            value === t.id
              ? "bg-white text-primary shadow-sm"
              : "text-ink/50 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
