import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pathnameToNavKey } from "@/lib/subscriptions/nav-features";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");

/** Préfixes déclarés « vitrine » dans le middleware : ils l'emportent sur l'application sur le domaine public. */
function marketingPrefixes(): string[] {
  const source = read("src/middleware.ts");
  const body = source.slice(source.indexOf("function isMarketingPath"));
  const list = body.slice(body.indexOf("const prefixes = ["), body.indexOf("];"));
  return Array.from(list.matchAll(/"(\/[a-z0-9-]+)"/g), (match) => match[1].slice(1));
}

const pages = (dir: string) =>
  fs.readdirSync(path.resolve(dir), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);

describe("pages de l'application et pages vitrine", () => {
  it("lit bien la liste des préfixes vitrine", () => {
    expect(marketingPrefixes()).toContain("whatsapp");
  });

  it("aucune page de l'institut n'est masquée par une adresse vitrine", () => {
    const marketing = new Set(marketingPrefixes());
    // /connexion, /book, etc. n'existent pas côté application : toute collision rend l'écran inaccessible.
    expect(pages("src/app/domains/app").filter((segment) => marketing.has(segment))).toEqual([]);
  });

  it("l'écran WhatsApp de l'application garde ses droits et sa formule", () => {
    expect(pathnameToNavKey("/messages-whatsapp/")).toBe("whatsapp");
    expect(pathnameToNavKey("/domains/app/messages-whatsapp/")).toBe("whatsapp");
    expect(fs.existsSync(path.resolve("src/app/domains/app/messages-whatsapp/page.tsx"))).toBe(true);
  });

  it("aucun lien de l'application ne pointe vers la page vitrine WhatsApp", () => {
    for (const file of [
      "src/components/analytics/analytics-helpers.ts",
      "src/components/dashboard/quick-actions-drawer.tsx",
      "src/components/dashboard/saas-dashboard-mobile.tsx",
      "src/components/loyalty/loyalty-page.tsx",
      "src/lib/ai/service.ts",
    ]) {
      expect(read(file), file).not.toMatch(/["']\/whatsapp\/["']/);
    }
  });
});
