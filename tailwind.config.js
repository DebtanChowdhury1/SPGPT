/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",             //  ✅ required for next-themes
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
