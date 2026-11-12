import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponsiveTableProps = {
  headers: string[];
  children: ReactNode;
  cards: ReactNode;
  minWidthClass?: string;
};

/**
 * Table desktop/tablette (md+) · cartes empilées sur mobile.
 */
export function ResponsiveTable({
  headers,
  children,
  cards,
  minWidthClass = "min-w-[640px]",
}: ResponsiveTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto surface md:block">
        <table className={cn("w-full text-left text-sm", minWidthClass)}>
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">{cards}</div>
    </>
  );
}

