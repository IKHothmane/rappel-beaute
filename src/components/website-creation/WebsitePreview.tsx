import Image from "next/image";
import { CalendarDays, Check, Sparkles } from "lucide-react";
import "./website-preview.css";

export type WebsiteVariant = "vitrine" | "rendez-vous" | "boutique" | "complet";
const TITLES: Record<WebsiteVariant, string> = {
  vitrine: "Votre institut, votre univers",
  "rendez-vous": "Votre prochain moment beauté",
  boutique: "Vos essentiels beauté",
  complet: "Soins, beauté et bien-être",
};

/** Illustrative, non-interactive website layouts, independent of the application UI. */
export function WebsitePreview({
  variant = "vitrine",
  phone = false,
}: {
  variant?: WebsiteVariant;
  phone?: boolean;
}) {
  return (
    <div
      className={`cw-device${phone ? " cw-device-phone" : ""}`}
      role="img"
      aria-label={`Maquette illustrative de site ${variant}, ${phone ? "sur mobile" : "sur ordinateur"}`}
    >
      <div className={`cw-device-screen cw-preview-${variant}`} aria-hidden="true">
        <div className="cw-mini-nav">
          <span>
            <Sparkles />
            Maison Belle
          </span>
          <span>Accueil · Soins · Contact</span>
          <b>Prendre RDV</b>
        </div>
        {variant === "boutique" ? (
          <div className="cw-mini-shop">
            <span className="cw-mini-title">{TITLES[variant]}</span>
            <p>La sélection de votre institut</p>
            <div className="cw-mini-products">
              {["Soin visage", "Huile corps", "Crème mains"].map((label, i) => (
                <div key={label}>
                  <span className={`cw-bottle cw-bottle-${i}`} />
                  <strong>{label}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="cw-mini-hero">
              <div>
                <span>Votre institut de beauté</span>
                <span className="cw-mini-title">{TITLES[variant]}</span>
                <p>Un lieu pour prendre soin de vous.</p>
                <b>{variant === "rendez-vous" ? "Choisir mon créneau" : "Découvrir nos soins"}</b>
              </div>
              <Image
                src="/brand/institut-beaute-soin.webp"
                alt=""
                width={1536}
                height={1024}
                sizes="(max-width: 700px) 260px, 440px"
              />
            </div>
            {variant === "rendez-vous" ? (
              <div className="cw-mini-times">
                <CalendarDays />
                <span>Votre date</span>
                <b>10:00</b>
                <b>11:00</b>
                <b>14:00</b>
              </div>
            ) : (
              <div className="cw-mini-services">
                {["Soin visage", "Bien-être", "Nos services"].map((text) => (
                  <span key={text}>
                    <Sparkles />
                    {text}
                  </span>
                ))}
              </div>
            )}
            {variant === "complet" && (
              <div className="cw-mini-complete">
                <Check />
                Vos soins, vos produits et vos avis au même endroit.
              </div>
            )}
          </>
        )}
      </div>
      {!phone && <span className="cw-device-base" aria-hidden="true" />}
    </div>
  );
}
