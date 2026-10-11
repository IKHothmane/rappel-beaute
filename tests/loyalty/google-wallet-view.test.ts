import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loyaltyCardHex } from "@/lib/loyalty/card-color";
import {
  absoluteWalletUri,
  cardArtwork,
  compactLogo,
  genericClassAppearance,
  genericObjectUpdate,
  walletAssetOrigin,
} from "@/lib/loyalty/google-wallet-view";

const ART = "/loyalty/fond-bordeaux.png";

describe("aperçu Google Wallet", () => {
  it("publie les images sur rappelbeauty.com", () => {
    expect(walletAssetOrigin("http://localhost:3000")).toBe("https://rappelbeauty.com");
    expect(absoluteWalletUri("http://localhost:3000", ART)).toBe(`https://rappelbeauty.com${ART}`);
  });

  it("met le logo de l'institut dans le cercle, et le feuillage en bandeau", () => {
    const logo = compactLogo("https://rappelbeauty.com", "/logos/institut-royal.png", ART);
    const art = cardArtwork("https://rappelbeauty.com", ART);
    expect(logo?.sourceUri.uri).toBe("https://rappelbeauty.com/logos/institut-royal.png");
    expect(art?.sourceUri.uri).toBe("https://rappelbeauty.com/loyalty/fond-bordeaux-hero.png");
    expect(compactLogo("https://rappelbeauty.com", null, ART)?.sourceUri.uri).toBe(`https://rappelbeauty.com${ART}`);
    expect(compactLogo("https://rappelbeauty.com", null, ART)?.sourceUri.uri).not.toContain("card-logo.png");
  });

  it("aligne le nom et la progression sans toucher au QR", () => {
    const template = genericClassAppearance().classTemplateInfo;
    expect(template.listTemplateOverride.firstRowOption.fieldOption.fields[0]?.fieldPath).toBe(
      "object.textModulesData['institut']",
    );
    expect(template.listTemplateOverride.secondRowOption.fields[0]?.fieldPath).toBe(
      "object.textModulesData['progress']",
    );
    expect(template.cardTemplateOverride.cardRowTemplateInfos[0]?.twoItems?.startItem.firstValue.fields[0]?.fieldPath).toBe(
      "object.textModulesData['institut']",
    );
    expect(template.cardTemplateOverride.cardRowTemplateInfos[0]?.twoItems?.endItem.firstValue.fields[0]?.fieldPath).toBe(
      "object.textModulesData['progress']",
    );

    const barcode = { type: "QR_CODE", value: "E4FB", alternateText: "E4FB" };
    const art = cardArtwork("https://rappelbeauty.com", ART);
    const updated = genericObjectUpdate({
      cardTitle: { defaultValue: { language: "fr-FR", value: "Institut Royal" } },
      subheader: { defaultValue: { language: "fr-FR", value: "Carte fidélité" } },
      header: { defaultValue: { language: "fr-FR", value: "2 / 10" } },
      hexBackgroundColor: loyaltyCardHex("#9c1020"),
      logo: compactLogo("https://rappelbeauty.com", null, ART),
      wideLogo: undefined,
      heroImage: art,
      textModulesData: [
        { id: "institut", header: "Institut", body: "Institut Royal" },
        { id: "progress", header: "Passages", body: "2 / 10" },
      ],
      barcode,
    });

    expect(updated.hexBackgroundColor).toBe("#9c1020");
    expect(updated.cardTitle.defaultValue.value).toBe("Institut Royal");
    expect(updated.header.defaultValue.value).toBe("2 / 10");
    expect(updated.heroImage?.sourceUri.uri).toBe("https://rappelbeauty.com/loyalty/fond-bordeaux-hero.png");
    expect(updated.wideLogo).toBeUndefined();
    expect(updated.logo?.sourceUri.uri).not.toContain("card-logo.png");
    expect(updated.barcode).toEqual(barcode);
  });

  it("l'illustration ouverte a le grand format Google 1032×812", () => {
    const png = readFileSync("public/loyalty/fond-bordeaux-hero.png");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1032);
    expect(png.readUInt32BE(20)).toBe(812);
  });
});
