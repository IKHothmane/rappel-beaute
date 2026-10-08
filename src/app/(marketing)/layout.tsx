import { JsonLd } from "@/components/www/JsonLd";
import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";
import { marketingJsonLd } from "@/lib/seo";

// Chaque page vitrine déclare son propre rendu. Ce layout ne force pas
// le statique : /carte/[token] doit rester dynamique, sinon Next renvoie 500.
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLd data={marketingJsonLd()} />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
