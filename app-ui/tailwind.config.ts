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
        coral: {
          DEFAULT: "#E86A33",
          light: "#FFF4F0",
          dark: "#D45A25",
        },
        cb: {
          bg: "#FAFAFA",
          "bg-alt": "#F5F5F5",
          border: "#E8E8E8",
          "border-light": "#F0F0F0",
          text: "#1A1A1A",
          "text-secondary": "#6B6B6B",
          "text-muted": "#9A9A9A",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 12px rgba(0,0,0,0.06)",
        lg: "0 12px 40px rgba(0,0,0,0.08)",
        xl: "0 24px 60px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
