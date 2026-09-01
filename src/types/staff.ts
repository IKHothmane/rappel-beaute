export type StaffStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "ARCHIVED";
export type LeaveType = "CONGE" | "MALADIE" | "ABSENCE" | "AUTRE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type StaffListItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  status: StaffStatus;
  hireDate: string | null;
  appointmentCount: number;
  revenue: number;
  rating: number | null;
  serviceNames: string[];
  serviceIds: string[];
};

export type StaffScheduleSlot = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type StaffBreakSlot = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type StaffLeaveItem = {
  id: string;
  startAt: string;
  endAt: string;
  type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
};

export type StaffServiceLink = {
  serviceId: string;
  serviceName: string;
  category: string | null;
  active: boolean;
};

export type StaffCommissionItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  type: "PERCENTAGE" | "FIXED";
  percentage: number | null;
  fixedAmount: number | null;
};

export type StaffPerformance = {
  appointmentCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  revenue: number;
  averageTicket: number;
  rating: number | null;
  monthlyRevenue: { month: string; revenue: number }[];
};

export type StaffDetail = StaffListItem & {
  notes: string | null;
  schedules: StaffScheduleSlot[];
  breaks: StaffBreakSlot[];
  leaves: StaffLeaveItem[];
  services: StaffServiceLink[];
  commissions: StaffCommissionItem[];
  performance: StaffPerformance;
  createdAt: string;
  updatedAt: string;
};

export type StaffAgendaContext = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  status: StaffStatus;
  schedules: StaffScheduleSlot[];
  breaks: StaffBreakSlot[];
  leaves: StaffLeaveItem[];
};

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  position?: string;
  status?: StaffStatus;
  hireDate?: string;
  notes?: string;
};

export type UpdateStaffInput = Partial<CreateStaffInput> & {
  active?: boolean;
};

export type UpdateStaffScheduleInput = {
  schedules: StaffScheduleSlot[];
  breaks: StaffBreakSlot[];
};

export type CreateStaffLeaveInput = {
  startAt: string;
  endAt: string;
  type?: LeaveType;
  reason?: string;
  status?: LeaveStatus;
};

export type UpdateStaffLeaveInput = Partial<CreateStaffLeaveInput>;

export type StaffListResponse = {
  data: StaffListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export const STAFF_STATUS_LABEL: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "Congé",
  ARCHIVED: "Archivée",
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  CONGE: "Congé",
  MALADIE: "Maladie",
  ABSENCE: "Absence",
  AUTRE: "Autre",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  CANCELLED: "Annulé",
};

export function staffDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
