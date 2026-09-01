import { SiteFooter } from "@/components/www/SiteFooter";
import { SiteHeader } from "@/components/www/SiteHeader";

export const dynamic = "force-static";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
