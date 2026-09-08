export type StaffOvertimeItem = {
  id: string;
  staffId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

export type StaffReplacementItem = {
  id: string;
  absentStaffId: string;
  absentName: string;
  substituteStaffId: string;
  substituteName: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  active: boolean;
};

export type OrganizationClosureItem = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

export type CreateStaffOvertimeInput = {
  staffId: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

export type CreateStaffReplacementInput = {
  absentStaffId: string;
  substituteStaffId: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

export type CreateOrganizationClosureInput = {
  startAt: string;
  endAt: string;
  reason?: string | null;
};

export type AgendaColumnMode = "staff" | "resource";
