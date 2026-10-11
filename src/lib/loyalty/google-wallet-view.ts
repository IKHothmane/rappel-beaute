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

export function absoluteWalletUri(origin: string | undefined, value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("https://")) return raw;
  if (!raw.startsWith("/")) return undefined;
  return `${walletAssetOrigin(origin)}${raw}`;
}

function walletImage(uri: string | undefined, label: string): WalletImage | undefined {
  if (!uri) return undefined;
  return {
    sourceUri: { uri },
    contentDescription: { defaultValue: { language: "fr-FR", value: label } },
  };
}

/**
 * Cercle de la liste. Le logo de l'institut s'il existe.
 * Sinon l'illustration de la carte, jamais le sceau générique.
 */
export function compactLogo(
  origin: string | undefined,
  logoUrl: string | null | undefined,
  backgroundUrl: string | null | undefined,
) {
  return (
    walletImage(absoluteWalletUri(origin, logoUrl), "Logo de l'institut") ??
    walletImage(absoluteWalletUri(origin, backgroundUrl), "Institut")
  );
}

/** Image large de la carte ouverte. Google l'affiche en 1032×812 sous les textes. */
export const WALLET_HERO_PATH = "/loyalty/fond-bordeaux-hero.png";

export function cardArtwork(origin: string | undefined, backgroundUrl: string | null | undefined) {
  const raw = backgroundUrl?.trim() || "";
  const path =
    raw.endsWith("/fond-bordeaux.png") || raw.endsWith("/institut-royal.png") ? WALLET_HERO_PATH : raw;
  return walletImage(absoluteWalletUri(origin, path), "Arrière-plan de la carte");
}

/**
 * Liste : nom puis progression.
 * Carte ouverte : les deux côte à côte, sous le titre.
 * Le fond décoratif complet n'existe pas dans la vignette compacte.
 */
export function genericClassAppearance() {
  return {
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: { fields: [{ fieldPath: "object.textModulesData['institut']" }] },
              },
              endItem: {
                firstValue: { fields: [{ fieldPath: "object.textModulesData['progress']" }] },
              },
            },
          },
        ],
      },
      listTemplateOverride: {
        firstRowOption: {
          fieldOption: { fields: [{ fieldPath: "object.textModulesData['institut']" }] },
        },
        secondRowOption: {
          fields: [{ fieldPath: "object.textModulesData['progress']" }],
        },
      },
    },
  };
}

export function genericObjectUpdate(object: {
  cardTitle: Localized;
  subheader: Localized;
  header: Localized;
  hexBackgroundColor: string;
  heroImage?: WalletImage;
  wideLogo?: WalletImage;
  logo?: WalletImage;
  textModulesData: unknown;
  barcode: unknown;
}) {
  return {
    cardTitle: object.cardTitle,
    subheader: object.subheader,
    header: object.header,
    hexBackgroundColor: loyaltyCardHex(object.hexBackgroundColor),
    ...(object.logo ? { logo: object.logo } : {}),
    ...(object.wideLogo ? { wideLogo: object.wideLogo } : {}),
    ...(object.heroImage ? { heroImage: object.heroImage } : {}),
    textModulesData: object.textModulesData,
    barcode: object.barcode,
  };
}
