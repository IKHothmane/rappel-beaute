import { JsonLd } from "@/components/www/JsonLd";
import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";
import { marketingJsonLd } from "@/lib/seo";
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
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
