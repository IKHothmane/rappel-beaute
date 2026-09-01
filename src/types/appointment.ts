export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentSource = "MANUAL" | "ONLINE_BOOKING" | "PHONE" | "WHATSAPP";

export type AgendaView = "day" | "week" | "month";

export interface Appointment {
  id: string;
  organizationId: string;

  customerId: string;
  customerName: string;

  serviceId: string;
  serviceName: string;

  staffId: string;
  staffName: string;

  resourceId?: string;
  resourceName?: string;

  startAt: string;
  endAt: string;

  price: number;
  deposit?: number;

  status: AppointmentStatus;
  source?: AppointmentSource;
  notes?: string;
}

export interface CreateAppointmentInput {
  customerId: string;
  serviceId: string;
  staffId: string;
  resourceId?: string;
  startAt: string;
  endAt: string;
  price: number;
  deposit?: number;
  notes?: string;
  source?: AppointmentSource;
}

export interface AvailabilityCheckInput {
  staffId: string;
  resourceId?: string;
  startAt: string;
  endAt: string;
  excludeAppointmentId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: string[];
}
