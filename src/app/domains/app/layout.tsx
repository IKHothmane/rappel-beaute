import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { AppProviders } from "@/components/app/AppProviders";

export const metadata: Metadata = {
  title: {
    default: "Institut · Rappel Beauté",
    template: "%s · Institut",
  },
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
