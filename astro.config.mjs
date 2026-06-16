// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

// econ.kpan.dev — fully static site on Cloudflare Pages.
// One static HTML page per region (correct OG meta), React card as a hydrated island.
export default defineConfig({
  site: "https://econ.kpan.dev",
  output: "static",
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  // Recharts ships CJS; let Vite pre-bundle it for the island.
  vite: {
    ssr: { noExternal: ["recharts"] },
  },
});
