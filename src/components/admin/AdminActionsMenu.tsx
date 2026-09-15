"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Menu d’actions en portal (évite le clip overflow des tableaux admin).
 */
export function AdminActionsMenu({
  triggerLabel = "Actions",
  children,
}: {
  triggerLabel?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.bottom + 6,
      right: window.innerWidth - r.right,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() {
      updatePosition();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-[#FBF4F6]"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {triggerLabel}
        <span aria-hidden className="text-ink/45">
          ▾
        </span>
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[80] w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg"
              style={{ top: coords.top, right: coords.right }}
              onClick={(e) => e.stopPropagation()}
            >
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export const adminMenuItemClass =
  "block w-full px-3 py-2.5 text-left text-sm text-ink/85 hover:bg-[#FBF4F6] disabled:opacity-50";
