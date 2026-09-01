import type {
  Appointment,
  CreateAppointmentInput,
} from "@/types/appointment";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function listAppointments(): Promise<Appointment[]> {
  const res = await fetch("/api/appointments/", { cache: "no-store", credentials: "include" });
  return parseJson<Appointment[]>(res);
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  const list = await listAppointments();
  return list.find((a) => a.id === id);
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/appointments/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de créer le rendez-vous." };
    }
    return { ok: true, appointment: data as Appointment };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment["status"],
): Promise<Appointment | null> {
  try {
    const res = await fetch(`/api/appointments/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Appointment;
  } catch {
    return null;
  }
}

export async function updateAppointment(
  id: string,
  patch: Partial<CreateAppointmentInput & { status: Appointment["status"] }>,
): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/appointments/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    }
    return { ok: true, appointment: data as Appointment };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}
