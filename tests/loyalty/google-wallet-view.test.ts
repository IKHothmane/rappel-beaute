import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loyaltyCardHex } from "@/lib/loyalty/card-color";
import {
  genericClassAppearance,
  genericListTemplate,
  genericObjectUpdate,
  passLogo,
  walletAssetOrigin,
} from "@/lib/loyalty/google-wallet-view";

describe("aperçu Google Wallet", () => {
  it("n'envoie pas localhost à Google pour le logo", () => {
    expect(walletAssetOrigin("http://localhost:3000")).toBe("https://rappelbeauty.com");
    expect(passLogo("http://localhost:3000").sourceUri.uri).toBe(
      "https://rappelbeauty.com/loyalty/card-logo.png",
    );
  });

  it("garde le nom et la progression dans la liste, et le logo dans la mise à jour", () => {
    const template = genericListTemplate();
    expect(template.listTemplateOverride.firstRowOption.fieldOption.fields[0]?.fieldPath).toBe("object.cardTitle");
    expect(template.listTemplateOverride.secondRowOption.fields[0]?.fieldPath).toBe("object.header");
    expect(genericClassAppearance().classTemplateInfo).toEqual(template);

    const barcode = { type: "QR_CODE", value: "E4FB", alternateText: "E4FB" };
    const updated = genericObjectUpdate({
      cardTitle: { defaultValue: { language: "fr-FR", value: "Institut Royal" } },
      subheader: { defaultValue: { language: "fr-FR", value: "Carte fidélité" } },
      header: { defaultValue: { language: "fr-FR", value: "2 / 10" } },
      hexBackgroundColor: loyaltyCardHex("#9c1020"),
      logo: passLogo("https://rappelbeauty.com"),
      heroImage: {
        sourceUri: { uri: "https://rappelbeauty.com/loyalty/institut-royal.png" },
        contentDescription: { defaultValue: { language: "fr-FR", value: "Arrière-plan de la carte" } },
      },
      textModulesData: [{ id: "progress", header: "Passages", body: "2 / 10" }],
      barcode,
    });

    expect(updated.hexBackgroundColor).toBe("#9c1020");
    expect(updated.header.defaultValue.value).toBe("2 / 10");
    expect(updated.cardTitle.defaultValue.value).toBe("Institut Royal");
    expect(updated.logo.sourceUri.uri).toBe("https://rappelbeauty.com/loyalty/card-logo.png");
    expect(updated.heroImage?.sourceUri.uri).toBe("https://rappelbeauty.com/loyalty/institut-royal.png");
    expect(updated.barcode).toEqual(barcode);
    expect(updated).not.toHaveProperty("id");
    expect(updated).not.toHaveProperty("classId");
  });

  it("le logo est un PNG carré bordeaux", () => {
    const png = readFileSync("public/loyalty/card-logo.png");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(660);
    expect(png.readUInt32BE(20)).toBe(660);
  });
});
