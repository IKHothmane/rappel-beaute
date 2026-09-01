import type { ExportFormat, ReportType } from "@/types/reports";

const FORMATS = new Set<ExportFormat>(["csv", "xlsx", "pdf"]);
const TYPES = new Set<ReportType>([
  "global",
  "finance",
  "agenda",
  "customers",
  "services",
  "staff",
  "inventory",
  "marketing",
  "reviews",
  "loyalty",
]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function parseReportExportParams(sp: URLSearchParams):
  | { ok: true; format: ExportFormat; type: ReportType }
  | { ok: false; error: string } {
  sp.delete("organizationId");

  const format = str(sp.get("format")) as ExportFormat | undefined;
  const type = str(sp.get("type")) as ReportType | undefined;

  if (!format || !FORMATS.has(format)) {
    return { ok: false, error: "Format invalide (csv, xlsx, pdf)." };
  }
  if (!type || !TYPES.has(type)) {
    return { ok: false, error: "Type de rapport invalide." };
  }

  return { ok: true, format, type };
}
