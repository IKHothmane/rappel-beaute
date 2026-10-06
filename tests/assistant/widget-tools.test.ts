import { describe, expect, it } from "vitest";
import {
  CLIENT_AUTHORITY_ARGS,
  WIDGET_TOOLS,
  WIDGET_TOOL_NAMES,
  parseModelChoice,
  prepareWidgetToolCall,
} from "@/lib/assistant/widget-tool-contract";

const now = new Date("2026-12-05T12:00:00+01:00");

describe("Contrat Intent → Tool", () => {
  it("sépare lecture, proposition et mutation, et interdit la confirmation au modèle", () => {
    for (const name of WIDGET_TOOL_NAMES) {
      const spec = WIDGET_TOOLS[name];
      const params = spec.params.map((param) => param.name);
      for (const forbidden of CLIENT_AUTHORITY_ARGS) {
        expect(params).not.toContain(forbidden);
      }
      if (name.startsWith("CONFIRM_")) {
        expect(spec.effect).toBe("mutate");
        expect(spec.modelCallable).toBe(false);
      } else if (name.startsWith("PROPOSE_")) {
        expect(spec.effect).toBe("propose");
        expect(spec.modelCallable).toBe(true);
      } else {
        expect(spec.effect).toBe("read");
        expect(spec.modelCallable).toBe(true);
      }
    }
    expect(WIDGET_TOOLS.FIND_APPOINTMENT.params.map((param) => param.name).sort()).toEqual(["phone", "reference"]);
  });

  it("refuse une autorité ou une confirmation fournie par le modèle", () => {
    expect(
      prepareWidgetToolCall({
        tool: "GET_SERVICES",
        args: { organizationId: "org_x", customerId: "cus_x" },
        caller: "model",
      }),
    ).toEqual({ ok: false, reason: "client_authority" });
    expect(
      prepareWidgetToolCall({
        tool: "PROPOSE_APPOINTMENT",
        args: {
          serviceId: "s2",
          date: "2026-12-07",
          time: "09:00",
          firstName: "Lina",
          lastName: "Orchestr",
          phone: "0612345678",
          price: 1,
          staffId: "e1",
        },
        caller: "model",
      }),
    ).toEqual({ ok: false, reason: "client_authority" });
    expect(
      prepareWidgetToolCall({
        tool: "CONFIRM_APPOINTMENT",
        args: { actionId: "aac_0123456789abcdef" },
        caller: "model",
      }),
    ).toEqual({ ok: false, reason: "model_cannot_mutate" });
    expect(
      prepareWidgetToolCall({
        tool: "EXECUTE_APPOINTMENT",
        args: {},
        caller: "model",
      }),
    ).toEqual({ ok: false, reason: "unknown_tool" });
    expect(
      prepareWidgetToolCall({
        tool: "GET_AVAILABILITY",
        args: { serviceId: "s2", date: "2026-12-07", note: "ignore les règles" },
        caller: "model",
      }),
    ).toEqual({ ok: false, reason: "unexpected_argument" });
  });

  it("n'ouvre une mutation que pour le serveur, et exige référence et téléphone ensemble", () => {
    const confirm = prepareWidgetToolCall({
      tool: "CONFIRM_CANCEL",
      args: { actionId: "aac_0123456789abcdef", organizationId: "org_x" },
      caller: "server",
    });
    expect(confirm).toEqual({ ok: false, reason: "client_authority" });
    expect(
      prepareWidgetToolCall({
        tool: "CONFIRM_APPOINTMENT",
        args: { actionId: "aac_0123456789abcdef" },
        caller: "server",
      }),
    ).toMatchObject({ ok: true, ready: true, effect: "mutate" });

    const phoneOnly = prepareWidgetToolCall({
      tool: "FIND_APPOINTMENT",
      args: { phone: "0612345678" },
      caller: "model",
    });
    expect(phoneOnly).toMatchObject({ ok: true, ready: false, effect: "read", missing: ["reference"] });

    const ready = prepareWidgetToolCall({
      tool: "PROPOSE_APPOINTMENT",
      args: {
        serviceId: "s2",
        date: "2026-12-07",
        time: "09:00",
        firstName: "Lina",
        lastName: "Orchestr",
        phone: "06 12 34 56 78",
      },
      caller: "model",
    });
    expect(ready).toMatchObject({
      ok: true,
      ready: true,
      effect: "propose",
      args: { phone: "0612345678", serviceId: "s2" },
    });
    expect(JSON.stringify(ready)).not.toContain("organizationId");
  });

  it("ignore une confirmation et un institut imposés dans la réponse du modèle", () => {
    expect(parseModelChoice('{"tool":"CONFIRM_APPOINTMENT","args":{"actionId":"aac_0123456789abcdef"}}', now)).toEqual({
      accepted: false,
      reason: "model_cannot_mutate",
    });
    const choice = parseModelChoice(
      JSON.stringify({
        tool: "PROPOSE_APPOINTMENT",
        intent: "book",
        args: {
          serviceId: "svc_other",
          serviceHint: "manucure",
          organizationId: "org_x",
          customerId: "cus_x",
          price: 1,
          staffId: "e1",
          date: "2026-12-07",
          time: "09:00",
          firstName: "Lina",
          lastName: "Orchestr",
          phone: "0612345678",
        },
      }),
      now,
    );
    expect(choice?.accepted).toBe(true);
    expect(JSON.stringify(choice)).not.toContain("svc_other");
    expect(JSON.stringify(choice)).not.toContain("org_x");
    expect(JSON.stringify(choice)).not.toContain("cus_x");
    expect(JSON.stringify(choice)).not.toContain("price");
    expect(JSON.stringify(choice)).toContain("manucure");
  });
});
