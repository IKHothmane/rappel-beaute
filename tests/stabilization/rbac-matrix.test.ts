import { describe, expect, it } from "vitest";
import {
  canReadFeature,
  canWriteFeature,
  canWriteFeatureLimited,
  getFeatureAccess,
  type AppFeature,
  type AppRole,
} from "@/lib/rbac";

type Level = "write" | "read" | "limited" | "none";

/** Matrice V1 attendue — backend source de vérité */
const EXPECTED: Record<AppFeature, Record<AppRole, Level>> = {
  agenda: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "write",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  customers: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "read",
    ACCOUNTANT: "read",
  },
  services: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "read",
    CASHIER: "read",
    ACCOUNTANT: "read",
  },
  staff: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "read",
    CASHIER: "limited",
    ACCOUNTANT: "read",
  },
  resources: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "read",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  stock: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "none",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  "cash-register": {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "none",
    CASHIER: "write",
    ACCOUNTANT: "read",
  },
  expenses: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "none",
    CASHIER: "limited",
    ACCOUNTANT: "read",
  },
  commissions: {
    OWNER: "write",
    MANAGER: "read",
    STAFF: "limited",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  loyalty: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "read",
    CASHIER: "limited",
    ACCOUNTANT: "read",
  },
  promotions: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "read",
    CASHIER: "limited",
    ACCOUNTANT: "read",
  },
  whatsapp: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "none",
    ACCOUNTANT: "none",
  },
  reactivation: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "none",
    ACCOUNTANT: "none",
  },
  marketing: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  reviews: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "none",
    ACCOUNTANT: "read",
  },
  analytics: {
    OWNER: "write",
    MANAGER: "write",
    STAFF: "limited",
    CASHIER: "limited",
    ACCOUNTANT: "write",
  },
  settings: {
    OWNER: "write",
    MANAGER: "limited",
    STAFF: "none",
    CASHIER: "none",
    ACCOUNTANT: "none",
  },
};

const ROLES: AppRole[] = ["OWNER", "MANAGER", "STAFF", "CASHIER", "ACCOUNTANT"];

describe("RBAC — matrice V1", () => {
  for (const [feature, byRole] of Object.entries(EXPECTED) as [AppFeature, Record<AppRole, Level>][]) {
    describe(feature, () => {
      for (const role of ROLES) {
        it(`${role} → ${byRole[role]}`, () => {
          expect(getFeatureAccess(role, feature)).toBe(byRole[role]);
        });
      }
    });
  }

  it("CASHIER ne peut pas accéder à l'agenda", () => {
    expect(canReadFeature("CASHIER", "agenda")).toBe(false);
    expect(canWriteFeature("CASHIER", "agenda")).toBe(false);
  });

  it("STAFF peut envoyer WhatsApp (limited) mais pas configurer les modèles", () => {
    expect(canWriteFeatureLimited("STAFF", "whatsapp")).toBe(true);
    expect(canWriteFeature("STAFF", "whatsapp")).toBe(false);
  });

  it("ACCOUNTANT lit le stock sans écrire", () => {
    expect(canReadFeature("ACCOUNTANT", "stock")).toBe(true);
    expect(canWriteFeature("ACCOUNTANT", "stock")).toBe(false);
  });
});
