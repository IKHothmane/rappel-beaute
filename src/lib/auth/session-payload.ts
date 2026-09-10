import type { AppRole } from "@/lib/rbac";
import type { PlatformRole } from "@/types/platform";
import type { SessionPayload, SessionUser } from "./types";

export function payloadToSession(payload: SessionPayload): SessionUser | null {
  if (payload.scope === "platform" && payload.accountType === "PLATFORM") {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as PlatformRole,
      scope: "platform",
      accountType: "PLATFORM",
    };
  }
  if (
    payload.scope === "app" &&
    payload.accountType === "ORGANIZATION" &&
    payload.organizationId &&
    payload.orgName &&
    payload.orgSlug
  ) {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as AppRole,
      organizationId: payload.organizationId,
      orgName: payload.orgName,
      orgSlug: payload.orgSlug,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: Boolean(payload.mustChangePassword),
      sessionVersion:
        typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  }
  if (payload.organizationId && payload.orgName && payload.orgSlug) {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as AppRole,
      organizationId: payload.organizationId,
      orgName: payload.orgName,
      orgSlug: payload.orgSlug,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: Boolean(
        (payload as { mustChangePassword?: unknown }).mustChangePassword,
      ),
      sessionVersion:
        typeof (payload as { sessionVersion?: unknown }).sessionVersion === "number"
          ? ((payload as { sessionVersion: number }).sessionVersion)
          : 0,
    };
  }
  return null;
}
