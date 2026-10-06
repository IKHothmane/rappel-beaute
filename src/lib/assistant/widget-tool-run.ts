import { createHash } from "crypto";
import { pool } from "@/lib/db/pool";
import {
  listCatalogProducts,
  listCatalogPromotions,
  listCatalogServices,
} from "@/lib/db/assistant-catalog";
import {
  confirmAssistantAppointment,
  lookupAssistantAppointment,
  proposeAssistantAppointment,
  proposeAssistantCancel,
  proposeAssistantReschedule,
} from "@/lib/db/assistant-booking";
import { getPublicAvailabilitySlots } from "@/lib/db/public-booking";
import type { PreparedWidgetCall, WidgetToolName } from "@/lib/assistant/widget-tool-contract";

type Session = { id: string; organizationId: string; organizationName: string };

type ReadyCall = Extract<PreparedWidgetCall, { ok: true; ready: true }>;

const CONFIRM_BY_TYPE = {
  CREATE_APPOINTMENT: "CONFIRM_APPOINTMENT",
  RESCHEDULE_APPOINTMENT: "CONFIRM_RESCHEDULE",
  CANCEL_APPOINTMENT: "CONFIRM_CANCEL",
} as const;

export type WidgetToolResult =
  | {
      tool: "GET_SERVICES";
      effect: "read";
      services: { id: string; name: string; durationMin: number; price: number }[];
    }
  | { tool: "GET_PRODUCTS"; effect: "read"; products: { name: string; salePrice: number }[] }
  | { tool: "GET_PROMOTIONS"; effect: "read"; promotions: { name: string }[] }
  | {
      tool: "GET_AVAILABILITY";
      effect: "read";
      serviceName: string;
      price: number;
      date: string;
      times: string[];
    }
  | {
      tool: "FIND_APPOINTMENT";
      effect: "read";
      appointment: {
        reference: string;
        serviceName: string;
        date: string;
        time: string;
        price: number;
        status: string;
      };
    }
  | {
      tool: "PROPOSE_APPOINTMENT" | "PROPOSE_RESCHEDULE" | "PROPOSE_CANCEL";
      effect: "propose";
      proposal: { serviceName: string; date: string; time: string; price: number; reference?: string };
    }
  | {
      tool: "CONFIRM_APPOINTMENT" | "CONFIRM_RESCHEDULE" | "CONFIRM_CANCEL";
      effect: "mutate";
      outcome: { reference?: string; serviceName: string; date: string; time: string; appointmentStatus?: string };
    };

export async function runWidgetTool(session: Session, call: ReadyCall): Promise<WidgetToolResult> {
  switch (call.tool) {
    case "GET_SERVICES": {
      const services = await listCatalogServices(session.organizationId);
      return {
        tool: call.tool,
        effect: "read",
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          durationMin: service.durationMin,
          price: service.price,
        })),
      };
    }
    case "GET_PRODUCTS": {
      const products = await listCatalogProducts(session.organizationId);
      return {
        tool: call.tool,
        effect: "read",
        products: products.map((product) => ({ name: product.name, salePrice: product.salePrice })),
      };
    }
    case "GET_PROMOTIONS": {
      const promotions = await listCatalogPromotions(session.organizationId);
      return {
        tool: call.tool,
        effect: "read",
        promotions: promotions.map((promotion) => ({ name: promotion.name })),
      };
    }
    case "GET_AVAILABILITY": {
      const services = await listCatalogServices(session.organizationId);
      const service = services.find((item) => item.id === call.args.serviceId);
      if (!service) throw new Error("SERVICE_NOT_FOUND");
      const slots = await getPublicAvailabilitySlots(session.organizationId, {
        serviceId: service.id,
        date: call.args.date,
      });
      return {
        tool: call.tool,
        effect: "read",
        serviceName: service.name,
        price: service.price,
        date: call.args.date,
        times: slots.filter((slot) => slot.available).map((slot) => slot.time),
      };
    }
    case "FIND_APPOINTMENT": {
      const appointment = await lookupAssistantAppointment({
        organizationId: session.organizationId,
        reference: call.args.reference,
        phone: call.args.phone,
      });
      return { tool: call.tool, effect: "read", appointment };
    }
    case "PROPOSE_APPOINTMENT": {
      const proposal = await proposeAssistantAppointment({
        session,
        idempotencyKey: idempotency([session.id, call.args.serviceId, call.args.date, call.args.time, call.args.phone]),
        body: {
          serviceId: call.args.serviceId,
          date: call.args.date,
          time: call.args.time,
          firstName: call.args.firstName,
          lastName: call.args.lastName,
          phone: call.args.phone,
        },
      });
      return { tool: call.tool, effect: "propose", proposal: publicProposal(proposal) };
    }
    case "PROPOSE_RESCHEDULE": {
      const proposal = await proposeAssistantReschedule({
        session,
        idempotencyKey: idempotency(["move", session.id, call.args.reference, call.args.date, call.args.time]),
        body: {
          reference: call.args.reference,
          phone: call.args.phone,
          date: call.args.date,
          time: call.args.time,
        },
      });
      return { tool: call.tool, effect: "propose", proposal: publicProposal(proposal) };
    }
    case "PROPOSE_CANCEL": {
      const proposal = await proposeAssistantCancel({
        session,
        idempotencyKey: idempotency(["cancel", session.id, call.args.reference]),
        body: { reference: call.args.reference, phone: call.args.phone },
      });
      return { tool: call.tool, effect: "propose", proposal: publicProposal(proposal) };
    }
    case "CONFIRM_APPOINTMENT":
    case "CONFIRM_RESCHEDULE":
    case "CONFIRM_CANCEL":
      return confirmPending(session, call.tool, call.args.actionId);
    default:
      throw new Error("unknown_tool");
  }
}

async function confirmPending(
  session: Session,
  tool: Extract<WidgetToolName, "CONFIRM_APPOINTMENT" | "CONFIRM_RESCHEDULE" | "CONFIRM_CANCEL">,
  actionId: string,
): Promise<Extract<WidgetToolResult, { effect: "mutate" }>> {
  const { rows } = await pool.query<{ type: string }>(
    `SELECT type::text AS type FROM "AssistantAction"
     WHERE id = $1 AND "organizationId" = $2`,
    [actionId, session.organizationId],
  );
  const type = rows[0]?.type;
  if (!type || !(type in CONFIRM_BY_TYPE)) throw new Error("ACTION_NOT_FOUND");
  if (CONFIRM_BY_TYPE[type as keyof typeof CONFIRM_BY_TYPE] !== tool) throw new Error("ACTION_MISMATCH");
  const confirmed = await confirmAssistantAppointment({ session, actionId });
  return {
    tool,
    effect: "mutate",
    outcome: {
      reference: confirmed.reference,
      serviceName: confirmed.serviceName,
      date: confirmed.date,
      time: confirmed.time,
      appointmentStatus: confirmed.appointmentStatus,
    },
  };
}

function publicProposal(proposal: {
  serviceName: string;
  date: string;
  time: string;
  price: number;
  reference?: string;
}) {
  return {
    serviceName: proposal.serviceName,
    date: proposal.date,
    time: proposal.time,
    price: proposal.price,
    reference: proposal.reference,
  };
}

function idempotency(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40);
}
