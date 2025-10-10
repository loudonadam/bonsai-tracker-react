/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
theme: {
  container: {
    center: true,
    padding: {
      DEFAULT: "1rem",     // ← adds breathing room on phones (~16px)
      sm: "1.25rem",
      lg: "2rem",          // ← keeps ~32px at desktop edges
      xl: "2.5rem",
      "2xl": "3rem",
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1600px",
    },
  },
  extend: {
    maxWidth: {
      "8xl": "1800px",
    },
  },
},
  plugins: [],
};
