/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', "Segoe UI", "system-ui", "sans-serif"],
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
        tokta: {
          50: "#f2f8f4",
          100: "#e3f3e8",
          200: "#c5e6d0",
          300: "#8fcb9e",
          500: "#1f8a4c",
          600: "#187544",
          700: "#0e4a32",
          800: "#0b3d2e",
          900: "#0d1f17",
          bright: "#5dde6a",
        },
      },
    },
  },
  plugins: [],
};
