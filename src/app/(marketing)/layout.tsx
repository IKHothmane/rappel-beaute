import { JsonLd } from "@/components/www/JsonLd";
import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";
import { marketingJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

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
