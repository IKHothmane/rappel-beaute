import { JsonLd } from "@/components/www/JsonLd";
import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";
import { marketingJsonLd } from "@/lib/seo";
import { AudiencePreferences } from "@/components/www/AudiencePreferences";
import "./vitrine.css";

// Chaque page vitrine déclare son propre rendu. Ce layout ne force pas
// le statique : /carte/[token] doit rester dynamique, sinon Next renvoie 500.
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-site">
      <JsonLd data={marketingJsonLd()} />
      <a href="#main-content" className="vt-skip-link">
        Aller au contenu principal
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <AudiencePreferences />
    </div>
  );
}
