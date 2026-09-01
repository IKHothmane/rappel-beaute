import Link from "next/link";
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

export function DataCard({
  title,
  subtitle,
  meta,
  href,
  onClick,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-ink/50">{subtitle}</p>
        ) : null}
      </div>
      {meta ? (
        <div className="shrink-0 text-right text-xs text-ink/55">{meta}</div>
      ) : null}
    </>
  );

  const classes = cn(
    "surface flex items-start gap-3 p-4 transition hover:border-primary/30",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, "w-full text-left")}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}
