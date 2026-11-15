export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#7A1C1C",
        "primary-dark": "#5C1313",
        accent: "#E8C999",
        "accent-dark": "#DDBA7A",
        background: "#F9F6F2",
        textMain: "#2D2D2D",
        textMuted: "#7A7A7A",
      },
    },
  },
  plugins: [],
  corePlugins: {
    ringColor: false,  
    ringWidth: false,   
    ringOffsetWidth: false
  }
};