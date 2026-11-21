import { describe, expect, it } from "vitest";
import { validateCreatePromotion } from "@/lib/validation/promo";

describe("types de promotion à la création", () => {
  it.each(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SERVICE"])("accepte %s", (type) => {
    expect(validateCreatePromotion({ name: "Test", type }).ok).toBe(true);
  });

  it.each(["PACKAGE", "HAPPY_HOUR", "INCONNU"])("refuse %s", (type) => {
    expect(validateCreatePromotion({ name: "Test", type })).toEqual({ ok: false, errors: ["type"] });
  });
});
