/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strip: {
          extDay: "#FEF08A",
          extDayText: "#713F12",
          intDay: "#F1F5F9",
          intDayText: "#0F172A",
          extNight: "#BBF7D0",
          extNightText: "#14532D",
          intNight: "#BFDBFE",
          intNightText: "#1E3A8A",
        }
      }
    },
  },
  plugins: [],
}
