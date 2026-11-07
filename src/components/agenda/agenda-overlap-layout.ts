export type CalendarEvent = {
  id: string;
  startAt: string;
  endAt: string;
};

export type PositionedEvent<T extends CalendarEvent> = {
  event: T;
  /** Index dans la pile (0 = fond) */
  column: number;
  /** Nombre de RDV qui se chevauchent dans le groupe */
  columns: number;
  /** Identifiant du groupe de chevauchement */
  groupId: string;
  left: number;
  width: number;
  zIndex: number;
};

/**
 * Empile les RDV qui se chevauchent (un sur l’autre), avec un léger décalage
 * horizontal pour laisser voir les cartes du dessous — pas de colonnes côte à côte.
 */
export function layoutOverlappingEvents<T extends CalendarEvent>(
  events: T[],
): PositionedEvent<T>[] {
  const sorted = [...events].sort((a, b) => {
    const start = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();

    if (start !== 0) return start;

    return (
      new Date(b.endAt).getTime() -
      new Date(b.startAt).getTime() -
      (new Date(a.endAt).getTime() - new Date(a.startAt).getTime())
    );
  });

  const result: PositionedEvent<T>[] = [];

  let group: T[] = [];
  let groupEnd = -Infinity;

  function flushGroup() {
    if (!group.length) return;

    const stacked = [...group];
    const columns = stacked.length;
    const groupId = stacked[0]!.id;
    const maxOffset = Math.min(18, Math.max(0, columns - 1) * 6);

    stacked.forEach((event, index) => {
      const offset =
        columns <= 1 ? 0 : (index / Math.max(1, columns - 1)) * maxOffset;
      result.push({
        event,
        column: index,
        columns,
        groupId,
        left: offset,
        width: Math.max(72, 100 - offset - 1),
        zIndex: 10 + index,
      });
    });

    group = [];
    groupEnd = -Infinity;
  }

  for (const event of sorted) {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }

    if (end <= start) continue;

    if (group.length && start >= groupEnd) {
      flushGroup();
    }

    group.push(event);
    groupEnd = Math.max(groupEnd, end);
  }

  flushGroup();

  return result;
}

export function peersInOverlapGroup<T extends CalendarEvent>(
  positioned: PositionedEvent<T>[],
  groupId: string,
): T[] {
  return positioned.filter((p) => p.groupId === groupId).map((p) => p.event);
}
