"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { assignStaffColors, type StaffColor } from "@/components/agenda/staff-colors";
import { listStaffForAgenda } from "@/modules/staff/service";

const StaffPaletteContext = createContext<Map<string, StaffColor>>(new Map());

/** Même ordre que le planning : une couleur stable par employée, partout dans l'app. */
export function StaffColorProvider({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState<Map<string, StaffColor>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    listStaffForAgenda()
      .then((rows) => {
        if (!cancelled) setPalette(assignStaffColors(rows.map((row) => row.id)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <StaffPaletteContext.Provider value={palette}>{children}</StaffPaletteContext.Provider>;
}

export function useStaffPalette() {
  return useContext(StaffPaletteContext);
}
