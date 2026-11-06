"use client";

import { useEffect, useId, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
};

export function ServiceImageUpload({
  value,
  onChange,
  disabled = false,
}: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function upload(file: File) {
    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formats autorisés : JPG, PNG et WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("image", file);

      const response = await fetch("/api/services/images/", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const result = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !result.imageUrl) {
        throw new Error(result.error || "Échec du téléchargement.");
      }

      onChange(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setUploading(false);
      setPreview(null);
    }
  }

  const locked = disabled || uploading;

  return (
    <div className="space-y-3">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed border-[#EAC4D5] bg-[#FFF5F9]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aperçu du service"
            width={800}
            height={600}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : value ? (
          <ServiceResponsiveImage
            imageUrl={value}
            alt="Aperçu du service"
            variant="main"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-[#A55477]">
            <Camera size={35} />
            <p className="text-sm font-semibold">Ajouter une photo du service</p>
            <p className="text-xs">800×600 (4:3) · JPG, PNG, WebP · 2 Mo max</p>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 size={30} className="animate-spin text-[#A01750]" />
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={locked}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#9B1B50] px-4 py-3 text-sm font-semibold text-white hover:bg-[#7F153F] ${
            locked ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <ImagePlus size={17} />
          {value ? "Changer la photo" : "Ajouter une photo"}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />

        {value ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => onChange(null)}
            className="rounded-xl border border-red-100 px-4 text-red-600 hover:bg-red-50 disabled:opacity-50"
            aria-label="Retirer la photo"
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
