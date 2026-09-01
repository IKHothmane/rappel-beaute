export type ResourceType =
  | "CABINE"
  | "SALLE"
  | "FAUTEUIL"
  | "TABLE"
  | "MACHINE"
  | "EQUIPEMENT"
  | "AUTRE";

export type MaintenanceType = "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "AUTRE";
export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  CABINE: "Cabine",
  SALLE: "Salle",
  FAUTEUIL: "Fauteuil",
  TABLE: "Table",
  MACHINE: "Machine",
  EQUIPEMENT: "Équipement",
  AUTRE: "Autre",
};

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  PREVENTIVE: "Préventive",
  CORRECTIVE: "Corrective",
  INSPECTION: "Inspection",
  AUTRE: "Autre",
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  SCHEDULED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const RESOURCE_TYPES: ResourceType[] = [
  "CABINE",
  "SALLE",
  "FAUTEUIL",
  "TABLE",
  "MACHINE",
  "EQUIPEMENT",
  "AUTRE",
];

export type ResourceListItem = {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  location: string | null;
  notes: string | null;
  active: boolean;
  serviceCount: number;
  serviceNames: string[];
  upcomingMaintenance: boolean;
  appointmentCount: number;
};

export type ResourceServiceLink = {
  serviceId: string;
  serviceName: string;
  category: string | null;
  quantity: number;
  active: boolean;
};

export type ResourceMaintenanceItem = {
  id: string;
  startAt: string;
  endAt: string;
  type: MaintenanceType;
  reason: string | null;
  status: MaintenanceStatus;
  createdAt: string;
};

export type ResourceReservation = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  staffName: string;
  customerName: string;
};

export type ResourceDetail = ResourceListItem & {
  services: ResourceServiceLink[];
  maintenances: ResourceMaintenanceItem[];
  reservations: ResourceReservation[];
  createdAt: string;
  updatedAt: string;
};

export type ResourceAgendaContext = {
  id: string;
  name: string;
  type: ResourceType;
  active: boolean;
  maintenances: ResourceMaintenanceItem[];
};

export type ResourceAvailabilitySlot = {
  startAt: string;
  endAt: string;
  kind: "appointment" | "maintenance";
  label: string;
};

export type ResourceAvailability = {
  resourceId: string;
  date: string;
  active: boolean;
  slots: ResourceAvailabilitySlot[];
};

export type CreateResourceInput = {
  name: string;
  type?: ResourceType;
  capacity?: number;
  location?: string;
  notes?: string;
  active?: boolean;
  serviceIds?: string[];
};

export type UpdateResourceInput = Partial<CreateResourceInput>;

export type CreateMaintenanceInput = {
  startAt: string;
  endAt: string;
  type?: MaintenanceType;
  reason?: string;
  status?: MaintenanceStatus;
};

export type UpdateMaintenanceInput = Partial<CreateMaintenanceInput>;

export type ResourceListResponse = {
  data: ResourceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function isBlockingMaintenance(status: MaintenanceStatus): boolean {
  return status === "SCHEDULED" || status === "IN_PROGRESS";
}
