import type { Config } from "tailwindcss";
import shared from "./tailwind.config";

/** Public routes keep the shared theme, without shipping dashboard-only utilities. */
const config: Config = {
  ...shared,
  content: [
    "./src/app/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/(marketing)/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/{www,home,sections,professional,website-creation,loyalty,ui,public-site}/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/booking/BookingPreview.tsx",
  ],
};

export default config;
