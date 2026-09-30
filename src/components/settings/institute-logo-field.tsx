"use client";

import { useRef, useState } from "react";
import { OrgLogo } from "@/components/app/org-logo";
import { useSession } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";

export function InstituteLogoField({
  name,
  canEdit,
}: {
  name: string;
  canEdit: boolean;
}) {
  const { user, refresh } = useSession();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const logoUrl = user && "orgLogoUrl" in user ? user.orgLogoUrl : null;

  async function onFile(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("logo", file);
      const res = await fetch("/api/settings/logo/", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Upload impossible.");
      await refresh();
      toast("Logo mis à jour. Il s'affiche dans l'application.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload impossible.", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl bg-[#FFEFF8] p-4 sm:col-span-2">
      <OrgLogo url={logoUrl} name={name} size={56} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">Logo de l&apos;institut</p>
        <p className="text-[12px] text-ink/50">PNG, JPG, WEBP ou SVG · max. 2 Mo</p>
        {canEdit ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-2 h-9 rounded-lg bg-white px-3 text-[13px] font-semibold text-ink shadow-sm disabled:opacity-50"
          >
            {busy ? "Envoi…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </div>
    </div>
  );
}
