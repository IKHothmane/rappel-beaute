"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PublicCartLine = {
  productId: string;
  name: string;
  slug: string;
  salePrice: number;
  quantity: number;
  unit: string;
};

type CartContextValue = {
  lines: PublicCartLine[];
  count: number;
  total: number;
  addItem: (item: Omit<PublicCartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const PublicCartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `rb-public-cart:${slug}`;
}

export function PublicCartProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [lines, setLines] = useState<PublicCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      if (raw) {
        const parsed = JSON.parse(raw) as PublicCartLine[];
        if (Array.isArray(parsed)) setLines(parsed);
      } else {
        setLines([]);
      }
    } catch {
      setLines([]);
    }
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, slug, hydrated]);

  const addItem = useCallback(
    (item: Omit<PublicCartLine, "quantity">, qty = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === item.productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === item.productId
              ? { ...l, quantity: Math.min(20, l.quantity + qty) }
              : l,
          );
        }
        return [...prev, { ...item, quantity: Math.min(20, Math.max(1, qty)) }];
      });
    },
    [],
  );

  const setQty = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.min(20, quantity) }
          : l,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const total = lines.reduce((s, l) => s + l.salePrice * l.quantity, 0);
    return { lines, count, total, addItem, setQty, removeItem, clear };
  }, [lines, addItem, setQty, removeItem, clear]);

  return (
    <PublicCartContext.Provider value={value}>
      {children}
    </PublicCartContext.Provider>
  );
}

export function usePublicCart() {
  const ctx = useContext(PublicCartContext);
  if (!ctx) throw new Error("usePublicCart must be used within PublicCartProvider");
  return ctx;
}
