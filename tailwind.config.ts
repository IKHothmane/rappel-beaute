import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy app tokens (marketing / admin)
        ink: "#241A22",
        paper: "#FFFBF9",
        line: "#F0E3E6",
        institut: "#171018",
        gold: "#C79A3B",

        // Material Design 3 — Rappel Beauté Prestige (Stitch)
        primary: {
          DEFAULT: "#ba0049",
          dark: "#900037",
          light: "#FDEAF0",
          container: "#e31c5f",
          fixed: "#ffd9de",
          "fixed-dim": "#ffb2bd",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#fffeff",
          fixed: "#400014",
          "fixed-variant": "#900037",
        },
        secondary: {
          DEFAULT: "#7b5900",
          container: "#fcca66",
          fixed: "#ffdea4",
          "fixed-dim": "#f0bf5c",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#755400",
          fixed: "#261900",
          "fixed-variant": "#5d4200",
        },
        tertiary: {
          DEFAULT: "#b61149",
          container: "#d93260",
          fixed: "#ffd9dd",
          "fixed-dim": "#ffb2bd",
        },
        "on-tertiary": {
          DEFAULT: "#ffffff",
          container: "#fffeff",
          fixed: "#400013",
          "fixed-variant": "#900036",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": {
          DEFAULT: "#ffffff",
          container: "#93000a",
        },
        background: "#fff7f9",
        "on-background": "#221820",
        surface: {
          DEFAULT: "#fff7f9",
          bright: "#fff7f9",
          dim: "#e7d5e0",
          variant: "#f0dde9",
          tint: "#bc004a",
          container: {
            DEFAULT: "#fce9f4",
            high: "#f6e3ef",
            highest: "#f0dde9",
            low: "#ffeff8",
            lowest: "#ffffff",
          },
        },
        "on-surface": {
          DEFAULT: "#221820",
          variant: "#5b3f43",
        },
        outline: {
          DEFAULT: "#8f6f73",
          variant: "#e4bdc2",
        },
        inverse: {
          surface: "#382d36",
          "on-surface": "#feecf7",
          primary: "#ffb2bd",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 18px 50px -20px rgba(36, 26, 34, 0.18)",
        mock: "0 32px 80px -28px rgba(36, 26, 34, 0.28)",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        kenburns: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
        scrollLine: {
          "0%": { transform: "scaleY(0)", transformOrigin: "top", opacity: "0" },
          "40%": { transform: "scaleY(1)", opacity: "1" },
          "100%": { transform: "scaleY(1)", transformOrigin: "bottom", opacity: "0" },
        },
        softShine: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        rise: "rise 0.7s ease-out both",
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        kenburns: "kenburns 18s ease-out forwards",
        "scroll-line": "scrollLine 1.8s ease-in-out infinite",
        "soft-shine": "softShine 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
