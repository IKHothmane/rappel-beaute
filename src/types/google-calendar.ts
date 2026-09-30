export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  calendarId: string | null;
  calendarName: string | null;
  orgName: string | null;
  connectedAt: string | null;
  canManage: boolean;
};

export type GoogleCalendarOption = {
  id: string;
  name: string;
  primary: boolean;
  canWrite: boolean;
};
