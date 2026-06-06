/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-anton)", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          subtle: "#e5e7eb",
          surface: "#f3f4f6",
        },
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
};
