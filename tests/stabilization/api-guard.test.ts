import { describe, expect, it } from "vitest";
import { stripOrganizationId } from "@/lib/auth/api-guard";

describe("stripOrganizationId", () => {
  it("retire organizationId du body client", () => {
    const body = {
      organizationId: "org_malveillant",
      customerId: "c1",
      price: 450,
    };
    const clean = stripOrganizationId(body);
    expect(clean).toEqual({ customerId: "c1", price: 450 });
    expect("organizationId" in clean).toBe(false);
  });

  it("ne modifie pas un body sans organizationId", () => {
    const body = { action: "skip", reviewId: "rev_1" };
    expect(stripOrganizationId(body)).toEqual(body);
  });
});
