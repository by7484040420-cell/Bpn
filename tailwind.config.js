/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1440",
          light: "#131E5C",
          dark: "#080D2B",
        },
        saffron: "#FF7A1A",
        brandred: "#E22C2C",
        brandgreen: "#1AA35E",
        brandpurple: "#6C3FD1",
        brandblue: "#1E6FE0",
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 14px rgba(11, 20, 64, 0.08)",
      },
    },
  },
  plugins: [],
};
