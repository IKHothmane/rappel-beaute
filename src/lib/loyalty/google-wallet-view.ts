import { loyaltyCardHex } from "@/lib/loyalty/card-color";

type Localized = { defaultValue: { language: "fr-FR"; value: string } };

export type WalletImage = {
  sourceUri: { uri: string };
  contentDescription: Localized;
};

/** Google ne récupère pas localhost. Les images du pass sont sur le site public. */
export function walletAssetOrigin(origin?: string) {
  const raw = (origin || "").replace(/\/$/, "");
  if (raw.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(raw)) return raw;
  return "https://rappelbeauty.com";
}

/**
 * Aperçu compact : Google Wallet affiche `logo` dans le cercle.
 * Sans logo, il écrit la première lettre du titre (le « I » gris).
 * `heroImage` et `hexBackgroundColor` ne colorient pas cette vignette.
 */
export function passLogo(origin?: string): WalletImage {
  return {
    sourceUri: { uri: `${walletAssetOrigin(origin)}/loyalty/card-logo.png` },
    contentDescription: { defaultValue: { language: "fr-FR", value: "Logo de la carte" } },
  };
}

/** Deux lignes de la liste : nom de l'institut, puis la progression déjà portée par `header`. */
export function genericListTemplate() {
  return {
    listTemplateOverride: {
      firstRowOption: {
        fieldOption: {
          fields: [{ fieldPath: "object.cardTitle" }],
        },
      },
      secondRowOption: {
        fields: [{ fieldPath: "object.header" }],
      },
    },
  };
}

export function genericClassAppearance() {
  return { classTemplateInfo: genericListTemplate() };
}

export function genericObjectUpdate(object: {
  cardTitle: Localized;
  subheader: Localized;
  header: Localized;
  hexBackgroundColor: string;
  heroImage?: WalletImage;
  logo: WalletImage;
  textModulesData: unknown;
  barcode: unknown;
}) {
  return {
    cardTitle: object.cardTitle,
    subheader: object.subheader,
    header: object.header,
    hexBackgroundColor: loyaltyCardHex(object.hexBackgroundColor),
    logo: object.logo,
    ...(object.heroImage ? { heroImage: object.heroImage } : {}),
    textModulesData: object.textModulesData,
    barcode: object.barcode,
  };
}
