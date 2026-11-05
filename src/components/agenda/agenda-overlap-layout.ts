export type CalendarEvent = {
  id: string;
  startAt: string;
  endAt: string;
};

export type PositionedEvent<T extends CalendarEvent> = {
  event: T;
  column: number;
  columns: number;
  left: number;
  width: number;
};

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

    const columnsEnd: number[] = [];
    const assigned: Array<{ event: T; column: number }> = [];

    for (const event of group) {
      const start = new Date(event.startAt).getTime();
      const end = new Date(event.endAt).getTime();

      let column = columnsEnd.findIndex((columnEnd) => columnEnd <= start);

      if (column === -1) {
        column = columnsEnd.length;
        columnsEnd.push(end);
      } else {
        columnsEnd[column] = end;
      }

      assigned.push({ event, column });
    }

    const columns = columnsEnd.length;
    const gap = 1.5;
    const width = 100 / columns;

    for (const { event, column } of assigned) {
      result.push({
        event,
        column,
        columns,
        left: column * width,
        width: Math.max(0, width - gap),
      });
    }

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
