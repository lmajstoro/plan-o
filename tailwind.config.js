/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "Segoe UI", "system-ui", "sans-serif"],
        display: ['"Audiowide"', '"Inter"', "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          500: "#64748b",
          700: "#334155",
          900: "#0f172a",
        },
        frigo: {
          50: "#f2fbf4",
          100: "#e3f6e6",
          200: "#c5ebca",
          300: "#92d99a",
          500: "#39B54A",
          600: "#309a40",
          700: "#39B54A",
          800: "#267833",
          900: "#1F2A37",
        },
      },
    },
  },
  plugins: [],
};
