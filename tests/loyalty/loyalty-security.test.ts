import { describe, expect, it } from "vitest";
import { canReadFeature, canWriteFeature, canWriteFeatureLimited, FEATURE_ACCESS } from "@/lib/rbac";

describe("Loyalty Security — Matrice des permissions par rôle", () => {
  it("STAFF : Voir, Scanner, Valider OK (limited) ; Modifier programme Interdit (write=false)", () => {
    expect(canReadFeature("STAFF", "loyalty")).toBe(true);
    expect(canWriteFeatureLimited("STAFF", "loyalty")).toBe(true);
    expect(canWriteFeature("STAFF", "loyalty")).toBe(false);
  });

  it("MANAGER : Voir, Scanner, Valider OK ; Modifier programme OK (write=true)", () => {
    expect(canReadFeature("MANAGER", "loyalty")).toBe(true);
    expect(canWriteFeatureLimited("MANAGER", "loyalty")).toBe(true);
    expect(canWriteFeature("MANAGER", "loyalty")).toBe(true);
  });

  it("OWNER : Tous les droits (write=true)", () => {
    expect(canReadFeature("OWNER", "loyalty")).toBe(true);
    expect(canWriteFeatureLimited("OWNER", "loyalty")).toBe(true);
    expect(canWriteFeature("OWNER", "loyalty")).toBe(true);
  });

  it("Vérification exacte de la matrice Étape 4", () => {
    // STAFF
    expect(FEATURE_ACCESS.STAFF.loyalty).toBe("limited");
    // MANAGER
    expect(FEATURE_ACCESS.MANAGER.loyalty).toBe("write");
    // OWNER
    expect(FEATURE_ACCESS.OWNER.loyalty).toBe("write");
  });
});
