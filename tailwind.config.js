/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sand: "#EDE3D2",
        sandlight: "#F7F2E7",
        ink: "#10211F", // deep teal-black, evokes Arc / dusk-over-water
        inkdeep: "#0B1715",
        gold: "#C9A227",
        terracotta: "#C1572B",
        clay: "#8C5A3C",
        mute: "#6F6656",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
