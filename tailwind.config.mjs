/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Card palette, mirrored from the prototype tokens (see src/lib/recession.mjs).
        panel: "#0E1A1C",
        raised: "#13262A",
        ink: "#EAF2F0",
        muted: "#86A39F",
        faint: "#5C7C79",
        clear: "#4FD1A8",
        watch: "#F2B544",
        tripped: "#FF6B5E",
        backdrop: "#081113",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
