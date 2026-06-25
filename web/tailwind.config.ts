import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mantle-ish dark palette
        ink: "#0a0b0d",
        panel: "#14161a",
        edge: "#23262d",
        accent: "#3ad6c5",
      },
    },
  },
  plugins: [],
};

export default config;
