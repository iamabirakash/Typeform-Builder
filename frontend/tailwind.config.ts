import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic colors backed by CSS variables — automatically switch light/dark
        app: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          border: "var(--color-border)",
          text: "var(--color-text)",
          "text-muted": "var(--color-text-muted)",
          accent: "var(--color-accent)",
          "accent-hover": "var(--color-accent-hover)",
        },
      },
    },
  },
  plugins: [
    // Inject CSS variables for light and dark palettes
    function ({ addBase }) {
      addBase({
        ":root": {
          "--color-bg": "#f7f6fa",
          "--color-surface": "#ffffff",
          "--color-border": "rgba(23, 23, 25, 0.08)",
          "--color-text": "#171719",
          "--color-text-muted": "rgba(23, 23, 25, 0.5)",
          "--color-accent": "#8b5cf6",
          "--color-accent-hover": "#7c3aed",
        },
        ".dark": {
          "--color-bg": "#0f172a",
          "--color-surface": "#1c1620",
          "--color-border": "rgba(255, 255, 255, 0.08)",
          "--color-text": "#f8fafc",
          "--color-text-muted": "rgba(248, 250, 252, 0.5)",
          "--color-accent": "#a78bfa",
          "--color-accent-hover": "#8b5cf6",
        },
      });
    },
  ],
};

export default config;
