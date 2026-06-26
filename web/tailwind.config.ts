import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // MantleFlow brutalist palette (from the Claude Design mockup)
        ink: "#0A0A0A", // deep black background
        paper: "#F3F3EE", // off-white foreground / borders
        acid: "#C8F24E", // acid-green highlight
        mut: "#9A9A93", // muted label text
        mut2: "#6F6F68", // dimmer muted text
        line: "#2A2A28", // hairline borders inside panels
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Brutalist = square. Neutralise the defaults so stray `rounded` utilities stay sharp.
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        caret: {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        dashmove: {
          to: { strokeDashoffset: "-20" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        caret: "caret 1.05s step-end infinite",
        dashmove: "dashmove 1.1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
