export function assistantBookingError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "";
  const map: Record<string, { status: number; message: string }> = {
    SERVICE_NOT_FOUND: { status: 404, message: "Prestation introuvable." },
    SLOT_UNAVAILABLE: {
      status: 409,
      message: "Ce créneau n'est plus disponible. Veuillez choisir un autre horaire.",
    },
    SLOT_CONFLICT: {
      status: 409,
      message: "Ce créneau vient d'être réservé. Veuillez choisir un autre horaire.",
    },
    SLOT_PAST: { status: 400, message: "Ce créneau est dans le passé." },
    ACTION_NOT_FOUND: { status: 404, message: "Proposition introuvable." },
    ACTION_EXPIRED: { status: 409, message: "Cette proposition a expiré. Choisissez à nouveau un créneau." },
    ACTION_CONFLICT: { status: 409, message: "Cette demande a déjà été envoyée avec d'autres informations." },
    ACTION_CLOSED: { status: 409, message: "Cette proposition n'est plus confirmable." },
    IDEMPOTENCY_KEY: { status: 400, message: "Clé d'idempotence invalide." },
    FEATURE_NOT_INCLUDED: {
      status: 403,
      message: "La réservation en ligne n'est pas incluse dans l'abonnement de cet institut.",
    },
    LIMIT_REACHED: {
      status: 403,
      message: "Limite de rendez-vous mensuelle atteinte pour cet institut.",
    },
    SUBSCRIPTION_INACTIVE: {
      status: 403,
      message: "Les réservations en ligne sont temporairement indisponibles.",
    },
    CUSTOMER_NOT_FOUND: { status: 404, message: "Cliente introuvable." },
    APPOINTMENT_NOT_FOUND: { status: 404, message: "Rendez-vous introuvable." },
    APPOINTMENT_CLOSED: { status: 409, message: "Ce rendez-vous ne peut plus être modifié." },
  };
  if (map[message]) return map[message];
  if (message && !/^[A-Z0-9_]+$/.test(message)) return { status: 400, message };
  return { status: 500, message: "Impossible d'enregistrer le rendez-vous." };
}
