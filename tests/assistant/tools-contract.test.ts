import { describe, expect, it } from "vitest";
import {
  authorizeAssistantTool,
  stripClientAuthority,
  type AssistantServerContext,
} from "@/modules/assistant/tools.contract";

const visitor: AssistantServerContext = {
  surface: "widget_visitor",
  organizationId: "org_server",
  customerId: null,
  verified: false,
};

const verified: AssistantServerContext = {
  ...visitor,
  surface: "widget_verified_customer",
  customerId: "cus_server",
  verified: true,
};

describe("Contrat des tools assistant", () => {
  it("laisse un visiteur consulter le catalogue et proposer un rendez-vous", () => {
    expect(authorizeAssistantTool("list_services", visitor)).toEqual({
      allowed: true,
      effect: "read",
    });
    expect(authorizeAssistantTool("search_availability", visitor)).toEqual({
      allowed: true,
      effect: "read",
    });
    expect(authorizeAssistantTool("propose_appointment", visitor)).toEqual({
      allowed: true,
      effect: "propose",
    });
  });

  it("laisse le visiteur retrouver, déplacer ou annuler avec les outils du widget", () => {
    expect(authorizeAssistantTool("list_my_appointments", visitor).allowed).toBe(true);
    expect(authorizeAssistantTool("propose_reschedule", visitor)).toEqual({
      allowed: true,
      effect: "propose",
    });
    expect(authorizeAssistantTool("propose_cancel", visitor)).toEqual({
      allowed: true,
      effect: "propose",
    });
    expect(authorizeAssistantTool("get_my_loyalty", visitor).allowed).toBe(false);
  });

  it("autorise ces lectures une fois la cliente vérifiée par le serveur", () => {
    expect(authorizeAssistantTool("list_my_appointments", verified).allowed).toBe(true);
    expect(authorizeAssistantTool("propose_cancel", verified)).toEqual({
      allowed: true,
      effect: "propose",
    });
  });

  it("refuse la liste des clientes de l'institut depuis le widget", () => {
    expect(authorizeAssistantTool("get_customers", visitor)).toEqual({
      allowed: false,
      reason: "surface_denied",
    });
    expect(authorizeAssistantTool("get_customers", verified).allowed).toBe(false);
  });

  it("ignore organizationId et customerId fournis par le modèle", () => {
    expect(
      stripClientAuthority({
        organizationId: "org_injectee",
        customerId: "cus_injectee",
        permissions: ["all"],
        verified: true,
        serviceId: "svc_1",
      }),
    ).toEqual({ serviceId: "svc_1" });
  });
});
