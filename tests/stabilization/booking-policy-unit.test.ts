import { describe, expect, it } from "vitest";
import { noShowRiskLevel } from "@/lib/db/booking-policy";
import { validateUpdateBookingPolicy } from "@/lib/validation/booking-policy";
import type { BookingPolicySettings } from "@/types/booking-policy";

const policy: BookingPolicySettings = {
  depositsEnabled: true,
  defaultMode: "FIXED",
  defaultFixedAmount: 100,
  defaultPercent: null,
  confirmDeadlineHours: 24,
  lateCancelHours: 24,
  onCustomerLateCancel: "KEEP",
  onNoShow: "KEEP",
  onInstituteCancel: "REFUND",
  noShowWarnAt: 1,
  noShowRequireDepositAt: 2,
  noShowStrictAt: 3,
};

describe("41.17 — validation politique acompte (sans DB)", () => {
  it("noShowRiskLevel", () => {
    expect(noShowRiskLevel(0, policy)).toBe("NONE");
    expect(noShowRiskLevel(1, policy)).toBe("WARN");
    expect(noShowRiskLevel(2, policy)).toBe("REQUIRE_DEPOSIT");
    expect(noShowRiskLevel(5, policy)).toBe("STRICT");
  });

  it("validateUpdateBookingPolicy accepte un PATCH valide", () => {
    const res = validateUpdateBookingPolicy({
      depositsEnabled: true,
      defaultMode: "PERCENT",
      defaultPercent: 20,
      onInstituteCancel: "REFUND",
    });
    expect(res.ok).toBe(true);
  });

  it("validateUpdateBookingPolicy refuse un mode invalide", () => {
    const res = validateUpdateBookingPolicy({ defaultMode: "CRYPTO" });
    expect(res.ok).toBe(false);
  });
});
