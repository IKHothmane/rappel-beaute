import { describe, expect, it } from "vitest";
import { originAccessAllowed } from "@/lib/http/origin-guard";

describe("origine Cloudflare", () => {
  it("sans secret configuré, la requête passe", () => {
    expect(originAccessAllowed(null, undefined)).toBe(true);
    expect(originAccessAllowed("nimporte", "")).toBe(true);
  });

  it("secret requis et header absent → refus", () => {
    expect(originAccessAllowed(null, "secret-origine")).toBe(false);
  });

  it("header incorrect → refus", () => {
    expect(originAccessAllowed("autre", "secret-origine")).toBe(false);
    expect(originAccessAllowed("secret-origine-x", "secret-origine")).toBe(false);
  });

  it("header exact → accès", () => {
    expect(originAccessAllowed("secret-origine", "secret-origine")).toBe(true);
  });
});
