"use client";

import { Dropdown } from "@/components/ui/dropdown";
import type { PurchaseStatus } from "@/types/procurement";

export function PurchaseFilters({ status, onStatus, supplierId, onSupplier, suppliers, showStatus = true }: {
  status: PurchaseStatus | "";
  onStatus: (value: PurchaseStatus | "") => void;
  supplierId: string;
  onSupplier: (value: string) => void;
  suppliers: { id: string; name: string }[];
  showStatus?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
      {showStatus ? (
        <div className="min-w-0 space-y-1.5 sm:w-52">
          <span className="block text-xs font-semibold text-ink/60">Statut</span>
          <Dropdown ariaLabel="Statut des commandes" value={status} onChange={(value) => onStatus(value as PurchaseStatus | "")} options={[
            { value: "", label: "Tous les statuts" },
            { value: "DRAFT", label: "Brouillon", dotClassName: "bg-amber-400" },
            { value: "ORDERED", label: "Commandée", dotClassName: "bg-primary" },
            { value: "PARTIALLY_RECEIVED", label: "Partiellement reçue", dotClassName: "bg-amber-500" },
            { value: "RECEIVED", label: "Reçue", dotClassName: "bg-emerald-500" },
            { value: "CANCELLED", label: "Annulée", dotClassName: "bg-gray-400" },
          ]} />
        </div>
      ) : null}
      <div className="min-w-0 space-y-1.5 sm:w-52">
        <span className="block text-xs font-semibold text-ink/60">Fournisseur</span>
        <Dropdown ariaLabel="Fournisseur" value={supplierId} onChange={onSupplier} options={[
          { value: "", label: "Tous les fournisseurs" },
          ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
        ]} />
      </div>
    </div>
  );
}
