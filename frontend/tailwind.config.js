/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6C47FF",
          light: "#8B6EFF",
          dark: "#512DFF",
        },
        secondary: {
          DEFAULT: "#FF6B9D",
          light: "#FF8EBA",
          dark: "#E04F81",
        },
        accent: {
          DEFAULT: "#FFD700",
          light: "#FFE24D",
          dark: "#CCA300",
        },
        bg: {
          DEFAULT: "#F4F5F7",
          surface: "#FFFFFF",
          border: "rgba(108, 71, 255, 0.08)",
        },
        text: {
          primary: "#0F172A",
          secondary: "#64748B",
        },
        success: "#22C55E",
        error: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(108, 71, 255, 0.08), 0 1px 3px rgba(108, 71, 255, 0.02)",
        premium: "0 20px 40px -15px rgba(26, 26, 46, 0.05)",
      },
      backdropBlur: {
        luxury: "12px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
