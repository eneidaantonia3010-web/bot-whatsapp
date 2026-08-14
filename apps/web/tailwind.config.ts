import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-error-container": "#ffdad6",
        "on-primary": "#303037",
        "on-primary-fixed-variant": "#47464e",
        "surface-bright": "#373a3b",
        "inverse-surface": "#e1e3e4",
        "primary-container": "#0f0f16",
        "on-primary-fixed": "#1b1b22",
        "surface-tint": "#c8c5cf",
        "inverse-on-surface": "#2e3132",
        "secondary": "#ffb1c5",
        "secondary-fixed": "#ffd9e1",
        "surface": "#111415",
        "on-secondary-container": "#fff6f7",
        "on-surface": "#e1e3e4",
        "on-background": "#e1e3e4",
        "surface-variant": "#323536",
        "on-secondary-fixed": "#3f001a",
        "outline": "#929095",
        "on-secondary-fixed-variant": "#8f0044",
        "tertiary-container": "#1d0034",
        "on-tertiary-fixed-variant": "#6a0baa",
        "surface-container": "#1d2021",
        "outline-variant": "#47464b",
        "primary-fixed": "#e4e1eb",
        "on-surface-variant": "#c8c5cb",
        "secondary-container": "#df006e",
        "surface-container-low": "#191c1d",
        "surface-container-highest": "#323536",
        "primary-fixed-dim": "#c8c5cf",
        "surface-container-high": "#282a2b",
        "secondary-fixed-dim": "#ffb1c5",
        "tertiary-fixed": "#f2daff",
        "tertiary": "#e0b6ff",
        "on-primary-container": "#7c7b84",
        "inverse-primary": "#5e5d66",
        "tertiary-fixed-dim": "#e0b6ff",
        "on-tertiary": "#4c007d",
        "primary": "#c8c5cf",
        "on-tertiary-container": "#a456e5",
        "error": "#ffb4ab",
        "surface-container-lowest": "#0c0f10",
        "on-secondary": "#65002f",
        "on-error": "#690005",
        "error-container": "#93000a",
        "background": "#111415",
        "on-tertiary-fixed": "#2e004e",
        "surface-dim": "#111415"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "8px",
        "margin-mobile": "20px",
        "gutter": "min(4vw, 32px)",
        "container-max": "1440px",
        "section-gap": "clamp(80px, 10vh, 160px)"
      },
      fontFamily: {
        "headline-lg-mobile": ["Bodoni Moda"],
        "body-md": ["Hanken Grotesk"],
        "label-md": ["Hanken Grotesk"],
        "body-lg": ["Hanken Grotesk"],
        "headline-md": ["Bodoni Moda"],
        "display-lg": ["Bodoni Moda"],
        "headline-lg": ["Bodoni Moda"],
        "display-lg-mobile": ["Bodoni Moda"]
      },
      fontSize: {
        "headline-lg-mobile": ["clamp(28px, 5vw, 32px)", { "lineHeight": "1.2", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }],
        "label-md": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "body-lg": ["clamp(18px, 2vw, 20px)", { "lineHeight": "1.6", "fontWeight": "400" }],
        "headline-md": ["clamp(22px, 3vw, 28px)", { "lineHeight": "1.3", "fontWeight": "500" }],
        "display-lg": ["clamp(48px, 6vw, 84px)", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg": ["clamp(32px, 4vw, 56px)", { "lineHeight": "1.15", "fontWeight": "600" }],
        "display-lg-mobile": ["clamp(40px, 8vw, 48px)", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }]
      }
    },
  },
  plugins: [],
};
export default config;
