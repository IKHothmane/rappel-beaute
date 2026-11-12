"use client";

import { useEffect } from "react";

const REMEMBERED_CARDS_KEY = "rb_cards";

/** Garde le jeton de la carte dans le navigateur : un second scan du QR d'adhésion retrouve la même carte. */
export function RememberCard({ token }: { token: string }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REMEMBERED_CARDS_KEY);
      const list: unknown = raw ? JSON.parse(raw) : [];
      const current = Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
      const next = [token, ...current.filter((item) => item !== token)].slice(0, 5);
      window.localStorage.setItem(REMEMBERED_CARDS_KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible (navigation privée) : le cookie reste le seul mécanisme */
    }
  }, [token]);
  return null;
}
