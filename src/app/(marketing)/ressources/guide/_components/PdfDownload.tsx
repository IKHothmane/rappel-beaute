import { Download } from "lucide-react";
import { GUIDE, pdfSizeLabel } from "@/lib/guide";

export function PdfDownload({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  return (
    <a
      href={GUIDE.pdf}
      download
      className={`${variant === "primary" ? "btn-primary" : "btn-ghost"} gap-[var(--vt-size-0p5rem)] text-center`}
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Télécharger le guide (PDF) <span className="font-normal">· {pdfSizeLabel()}</span>
      </span>
    </a>
  );
}
