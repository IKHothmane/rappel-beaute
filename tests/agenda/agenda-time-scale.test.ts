import { describe, expect, it } from "vitest";
import {
  AGENDA_EMPTY_SLOT_HEIGHT_PX,
  AGENDA_LONG_GAP_HEIGHT_PX,
  agendaDateToY,
  agendaYToSlot,
  buildAgendaLayout,
  buildAgendaSlots,
} from "@/components/agenda/agenda-time-scale";
import { AGENDA_SLOT_HEIGHT_PX } from "@/modules/appointments/constants";

function at(h: number, m = 0) {
  return new Date(2026, 9, 29, h, m, 0, 0);
}

describe("Échelle agenda compacte", () => {
  it("replie une journée sans rendez-vous en un seul bandeau", () => {
    const layout = buildAgendaLayout([]);
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0]).toMatchObject({ kind: "gap", label: "08:00 – 00:00" });
    expect(layout.totalHeight).toBe(AGENDA_LONG_GAP_HEIGHT_PX);
  });

  it("garde la hauteur normale autour d’un rendez-vous et replie les longs trous", () => {
    const layout = buildAgendaLayout([{ start: at(10, 0), end: at(11, 0) }]);
    const gaps = layout.rows.filter((row) => row.kind === "gap");
    const busy = layout.rows.filter((row) => row.kind === "slot" && !row.empty);

    expect(gaps.map((row) => row.label)).toEqual(["08:00 – 10:00", "11:00 – 00:00"]);
    expect(busy.map((row) => (row.kind === "slot" ? row.slot.label : ""))).toEqual(["10:00", "10:30"]);
    expect(layout.totalHeight).toBe(AGENDA_LONG_GAP_HEIGHT_PX * 2 + AGENDA_SLOT_HEIGHT_PX * 2);
    expect(agendaDateToY(layout, at(10, 0))).toBe(AGENDA_LONG_GAP_HEIGHT_PX);
    expect(agendaDateToY(layout, at(11, 0))).toBe(AGENDA_LONG_GAP_HEIGHT_PX + AGENDA_SLOT_HEIGHT_PX * 2);
  });

  it("réduit un trou court sans le replier", () => {
    const layout = buildAgendaLayout([
      { start: at(10, 0), end: at(10, 30) },
      { start: at(11, 0), end: at(11, 30) },
    ]);
    const hole = layout.rows.find((row) => row.kind === "slot" && row.slot.label === "10:30");
    expect(hole).toMatchObject({ kind: "slot", empty: true, height: AGENDA_EMPTY_SLOT_HEIGHT_PX });
  });

  it("retrouve le créneau cliqué à l’intérieur d’un trou replié", () => {
    const layout = buildAgendaLayout([{ start: at(10, 0), end: at(11, 0) }]);
    expect(agendaYToSlot(layout, 0)).toMatchObject({ h: 8, m: 0 });
    expect(agendaYToSlot(layout, AGENDA_LONG_GAP_HEIGHT_PX - 0.01)).toMatchObject({ h: 9, m: 30 });
    expect(agendaYToSlot(layout, AGENDA_LONG_GAP_HEIGHT_PX)).toMatchObject({ h: 10, m: 0 });
  });

  it("occupe le même créneau horaire même si le rendez-vous est un autre jour", () => {
    const monday = new Date(2026, 9, 26, 15, 0, 0, 0);
    const mondayEnd = new Date(2026, 9, 26, 16, 0, 0, 0);
    const layout = buildAgendaLayout([{ start: monday, end: mondayEnd }]);
    const slots = buildAgendaSlots();
    const index = slots.findIndex((slot) => slot.label === "15:00");
    expect(layout.heights[index]).toBe(AGENDA_SLOT_HEIGHT_PX);
    expect(layout.heights[index - 1]).toBeLessThan(AGENDA_SLOT_HEIGHT_PX);
  });
});
