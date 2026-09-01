export type AppointmentSource = "MANUAL" | "ONLINE_BOOKING" | "PHONE" | "WHATSAPP";

export type PublicOrganizationProfile = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicServiceItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  durationMin: number;
  prepTimeMin: number;
  cleanupTimeMin: number;
  totalBlockMin: number;
  deposit: number | null;
};

export type PublicStaffItem = {
  id: string;
  displayName: string;
  available: boolean;
};

export type PublicAvailabilitySlot = {
  time: string;
  available: boolean;
};

export type PublicBookingInput = {
  serviceId: string;
  staffId?: string | null;
  date: string;
  time: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    marketingOptIn?: boolean;
  };
  notes?: string | null;
};

export type PublicBookingResult = {
  appointmentId: string;
  customerId: string;
  customerCreated: boolean;
  staffId: string;
  staffName: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  price: number;
  durationMin: number;
  source: "ONLINE_BOOKING";
};
