/* ───────────────────────────────────────────────────────────────────────────
   Build-time OG/share image generator.

   The region set is finite and known, so we pre-render one 1200×630 PNG per
   region — no runtime image rendering. Satori renders a JSX share template
   (verdict headline + value-vs-0.50 line + the kpan.dev mark) and resvg
   rasterizes it to public/og/recession-{region}.png, which each static page
   references as og:image / twitter:image.

   Fonts are read from @fontsource .woff files (offline, reproducible).
─────────────────────────────────────────────────────────────────────────── */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { C, TRIGGER_PCT, verdict, takeawayFor, markerPctFor } from "../src/lib/recession.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "../src/data/recession.json");
const OUT_DIR = resolve(__dirname, "../public/og");

const W = 1200;
const H = 630;

// Tiny hyperscript for Satori's element tree. Positional children win; otherwise
// keep props.children. Satori requires display:flex on any multi-child div, so
// default every div to flex unless the caller overrides it.
function h(type, props = {}, ...children) {
  const { children: propChildren, style, ...rest } = props;
  const kids = children.length ? children.flat() : propChildren;
  const mergedStyle = type === "div" ? { display: "flex", ...style } : style;
  return {
    type,
    props: { ...rest, ...(style !== undefined || type === "div" ? { style: mergedStyle } : {}), ...(kids !== undefined ? { children: kids } : {}) },
  };
}

function fontFile(pkg, file) {
  return resolve(dirname(require.resolve(`${pkg}/package.json`)), "files", file);
}

async function loadFonts() {
  const defs = [
    ["Inter", "@fontsource/inter", "inter-latin-400-normal.woff", 400],
    ["Inter", "@fontsource/inter", "inter-latin-500-normal.woff", 500],
    ["Inter", "@fontsource/inter", "inter-latin-600-normal.woff", 600],
    ["Bricolage Grotesque", "@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-500-normal.woff", 500],
    ["Bricolage Grotesque", "@fontsource/bricolage-grotesque", "bricolage-grotesque-latin-700-normal.woff", 700],
    ["JetBrains Mono", "@fontsource/jetbrains-mono", "jetbrains-mono-latin-500-normal.woff", 500],
    ["JetBrains Mono", "@fontsource/jetbrains-mono", "jetbrains-mono-latin-700-normal.woff", 700],
  ];
  return Promise.all(
    defs.map(async ([name, pkg, file, weight]) => ({
      name,
      weight,
      style: "normal",
      data: await readFile(fontFile(pkg, file)),
    }))
  );
}

// The share template for one region.
function template(r) {
  const v = verdict(r.value, r.prev);
  const markerPct = markerPctFor(r.value);
  const takeaway = takeawayFor(r.value);

  const mono = "JetBrains Mono";
  const display = "Bricolage Grotesque";

  return h(
    "div",
    {
      style: {
        width: W, height: H, display: "flex", flexDirection: "column",
        background: C.panel, color: C.text, padding: "64px 72px",
        fontFamily: "Inter", position: "relative",
      },
    },
    // accent wash strip
    h("div", {
      style: {
        position: "absolute", top: 0, left: 0, right: 0, height: 8,
        background: v.accent,
      },
    }),
    // eyebrow
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      h("div", {
        style: {
          fontFamily: mono, fontSize: 22, letterSpacing: 3, color: C.faint,
          textTransform: "uppercase",
        },
        children: "Sahm Rule · Recession Nowcast",
      }),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", fontSize: 24, fontWeight: 600, color: v.accent } },
        h("div", { style: { width: 14, height: 14, borderRadius: 99, background: v.accent, marginRight: 12 } }),
        v.label.toUpperCase()
      )
    ),
    // headline
    h("div", {
      style: { fontFamily: display, fontWeight: 700, fontSize: 56, color: C.text, marginTop: 40 },
      children: "Are we in a recession?",
    }),
    // verdict
    h("div", {
      style: { fontFamily: display, fontWeight: 700, fontSize: 64, color: v.accent, marginTop: 8 },
      children: v.head,
    }),
    // threshold track
    h(
      "div",
      { style: { display: "flex", position: "relative", height: 80, marginTop: 48 } },
      // baseline
      h("div", { style: { position: "absolute", top: 40, left: 0, right: 0, height: 6, borderRadius: 6, background: C.raised } }),
      // filled
      h("div", { style: { position: "absolute", top: 40, left: 0, width: `${markerPct}%`, height: 6, borderRadius: 6, background: v.accent } }),
      // trigger wall
      h("div", { style: { position: "absolute", top: 16, bottom: 16, left: `${TRIGGER_PCT}%`, width: 4, background: C.tripped } }),
      h("div", {
        style: { position: "absolute", top: -8, left: `${TRIGGER_PCT}%`, fontFamily: mono, fontSize: 20, color: C.tripped, display: "flex" },
        children: "TRIGGER 0.50",
      }),
      // marker value
      h("div", {
        style: { position: "absolute", top: 52, left: `${markerPct}%`, transform: "translateX(-50%)", fontFamily: mono, fontWeight: 700, fontSize: 30, color: v.accent, display: "flex" },
        children: r.value.toFixed(2),
      })
    ),
    // takeaway
    h("div", {
      style: { fontFamily: display, fontWeight: 500, fontSize: 34, color: C.text, marginTop: 40, lineHeight: 1.3 },
      children: takeaway,
    }),
    // spacer
    h("div", { style: { display: "flex", flexGrow: 1 } }),
    // footer
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: mono, fontSize: 22, color: C.faint } },
      h("div", { style: { display: "flex" }, children: `${r.name} · ${r.computed ? "computed" : "illustrative"}` }),
      h("div", { style: { display: "flex", color: C.muted }, children: "econ.kpan.dev · by Kevin Pan" })
    )
  );
}

async function main() {
  const { regions } = JSON.parse(await readFile(DATA, "utf8"));
  const fonts = await loadFonts();
  await mkdir(OUT_DIR, { recursive: true });

  let count = 0;
  for (const r of Object.values(regions)) {
    const key = r.code === "national" ? "national" : r.code.toLowerCase();
    const svg = await satori(template(r), { width: W, height: H, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
    await writeFile(resolve(OUT_DIR, `recession-${key}.png`), png);
    count++;
  }
  console.log(`✓ rendered ${count} OG images → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
