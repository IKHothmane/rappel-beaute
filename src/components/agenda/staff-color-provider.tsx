"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { assignStaffColors, type StaffColor } from "@/components/agenda/staff-colors";
import { listStaff } from "@/modules/staff/service";

const StaffPaletteContext = createContext<Map<string, StaffColor>>(new Map());

/** Une couleur stable par employée, la même dans toute l'app, y compris les archivées. */
export function StaffColorProvider({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState<Map<string, StaffColor>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids: string[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= 20) {
        const res = await listStaff({ page, limit: 100 });
        ids.push(...res.data.map((row) => row.id));
        totalPages = res.pagination.totalPages;
        if (res.data.length === 0) break;
        page += 1;
      }
      if (!cancelled) setPalette(assignStaffColors(ids));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <StaffPaletteContext.Provider value={palette}>{children}</StaffPaletteContext.Provider>;
}

export function useStaffPalette() {
  return useContext(StaffPaletteContext);
}
