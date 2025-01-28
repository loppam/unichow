/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      padding: {
        safe: "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
