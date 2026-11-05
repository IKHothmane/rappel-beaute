"use client";

import { Suspense } from "react";
import { SettingsPageView } from "@/components/settings/settings-page";

function SettingsFallback() {
  return (
    <div className="space-y-5 pb-10" aria-busy="true">
      <div className="h-28 animate-pulse rounded-[22px] bg-[#FCE7F1]" />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="hidden h-72 animate-pulse rounded-[20px] bg-[#FCE7F1] lg:col-span-3 lg:block" />
        <div className="h-96 animate-pulse rounded-[20px] bg-[#FCE7F1] lg:col-span-9" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsPageView />
    </Suspense>
  );
}
