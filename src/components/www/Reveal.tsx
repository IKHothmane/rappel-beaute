import type { ReactNode } from "react";

export function Reveal({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`vt-enter ${className ?? ""}`}>
      {children}
    </div>
  );
}
