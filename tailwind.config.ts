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
        noir: {
          DEFAULT: "#0A0A0A",
          soft: "#141414",
          card: "#1A1A1A",
        },
        or: {
          DEFAULT: "#C9A227",
          light: "#E5C158",
          dark: "#8B6F1A",
        },
        blanc: {
          DEFAULT: "#FAFAF9",
          pur: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        gold: "0 0 20px rgba(201, 162, 39, 0.15)",
        "gold-lg": "0 0 40px rgba(201, 162, 39, 0.25)",
      },
      backgroundImage: {
        "gradient-noir": "linear-gradient(135deg, #0A0A0A 0%, #141414 100%)",
        "gradient-card": "linear-gradient(145deg, #141414 0%, #0A0A0A 100%)",
        "gradient-or": "linear-gradient(135deg, #C9A227 0%, #E5C158 50%, #8B6F1A 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
