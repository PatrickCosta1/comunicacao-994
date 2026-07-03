/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        scout: {
          50: "#f0f7e6",
          100: "#d9efc4",
          200: "#bfe59e",
          300: "#a2db74",
          400: "#8bd254",
          500: "#76c93a",
          600: "#5fa82f",
          700: "#4a8725",
          800: "#37671c",
          900: "#254713",
        },
      },
    },
  },
  plugins: [],
};
