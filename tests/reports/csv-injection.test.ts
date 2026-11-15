import { describe, expect, it } from "vitest";
import { escapeCsv, staffToCsv } from "@/lib/reports/csv";

describe("escapeCsv - injection de formule", () => {
  it.each(["=SUM(A1:A2)", "+cmd|' /C calc'!A0", "-2+3", "@SUM(1)", "\tcmd", "\rcmd"])(
    "préfixe d'une apostrophe la chaîne %j",
    (value) => {
      const out = escapeCsv(value).replace(/^"|"$/g, "");
      expect(out.startsWith("'")).toBe(true);
    },
  );

  it("conserve les nombres, y compris négatifs", () => {
    expect(escapeCsv(-12.5)).toBe("-12.5");
    expect(escapeCsv(0)).toBe("0");
    expect(escapeCsv(42)).toBe("42");
  });

  it("conserve les chaînes purement numériques", () => {
    expect(escapeCsv("-12.5")).toBe("-12.5");
    expect(escapeCsv("+212612345678")).toBe("+212612345678");
    expect(escapeCsv("-3")).toBe("-3");
  });

  it("conserve les chaînes ordinaires, null et undefined", () => {
    expect(escapeCsv("Amina")).toBe("Amina");
    expect(escapeCsv("a-b=c")).toBe("a-b=c");
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("préserve le quoting CSV après préfixage", () => {
    expect(escapeCsv('=HYPERLINK("x";"y")')).toBe(`"'=HYPERLINK(""x"";""y"")"`);
  });

  it("neutralise un nom saisi par l'utilisateur dans un export", () => {
    const csv = staffToCsv({
      meta: { organizationName: "=Institut", periodFrom: "2026-01-01", periodTo: "2026-01-31" },
      items: [{ staffName: "@evil", appointments: 3, revenue: -10, commission: 1.5 }],
    });
    expect(csv).toContain("'=Institut");
    expect(csv).toContain("'@evil;3;-10;1.5");
  });
});
