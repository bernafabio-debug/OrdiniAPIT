import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        fluent: {
          bg: "#faf9f8",
          sidebar: "#242424",
          sidebarHover: "#333333",
          accent: "#2564cf",
          accentHover: "#1a4faa",
          border: "#e1dfdd",
          text: "#201f1e",
          textMuted: "#605e5c",
          success: "#107c10",
          warning: "#986f0b",
          danger: "#d13438"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06), 0 1px 8px rgba(0,0,0,0.04)"
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
