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
 * Cercle du pass. Logo de l'institut s'il en a un.
 * Sinon le logo Rappel Beauty, issu de /brand/logo.png, en carré 660×660.
 */
export const WALLET_LOGO_PATH = "/loyalty/brand-logo.png";

/** Grande image du pass. Le feuillage, format 1032×812. */
export const WALLET_HERO_PATH = "/loyalty/fond-bordeaux-hero.png";

function usesFoliageArtwork(backgroundUrl: string) {
  return (
    backgroundUrl.endsWith("/fond-bordeaux.png") ||
    backgroundUrl.endsWith("/fond-bordeaux-hero.png") ||
    backgroundUrl.endsWith("/fond-bordeaux-logo.png") ||
    backgroundUrl.endsWith("/institut-royal.png")
  );
}

export function compactLogo(origin: string | undefined, logoUrl: string | null | undefined) {
  const own = walletImage(absoluteWalletUri(origin, logoUrl), "Logo de l'institut");
  if (own) return own;
  if (usesFoliageArtwork(raw)) {
    return walletImage(absoluteWalletUri(origin, WALLET_LOGO_PATH), "Logo de la carte");
  }
  return walletImage(absoluteWalletUri(origin, raw), "Institut");
}

/** Fond visuel du pass : le feuillage en grand, pas une couleur seule. */
export function cardArtwork(origin: string | undefined, backgroundUrl: string | null | undefined) {
  const raw = backgroundUrl?.trim() || "";
  if (!raw) return undefined;
  if (usesFoliageArtwork(raw)) {
    return walletImage(absoluteWalletUri(origin, WALLET_HERO_PATH), "Fond de la carte");
  }
  return walletImage(absoluteWalletUri(origin, raw), "Fond de la carte");
}

/**
 * Liste : nom puis progression.
 * Carte ouverte : les deux côte à côte, sous le titre.
 * L'image de fond est le hero, sous les textes. Google peint le reste en couleur unie.
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
    heroImage: object.heroImage ?? null,
    wideLogo: null,
    textModulesData: object.textModulesData,
    barcode: object.barcode,
  };
}
