/* ───────────────────────────────────────────────────────────────────────────
   Build-time OG/share image generator for the market gauges.

   One 1200×630 PNG per gauge (Buffett, VIX, credit). Satori renders a JSX share
   template — verdict headline + banded rail + the kpan.dev mark — and resvg
   rasterizes it to public/og/{gauge}.png, referenced by each static page as
   og:image / twitter:image. Shares gauges.mjs with the live card so the share
   image and the page always agree.
─────────────────────────────────────────────────────────────────────────── */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { C, GAUGES, gaugeVerdict, markerPct, bandSegments, fmt } from "../src/lib/gauges.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "../src/data/markets.json");
const OUT_DIR = resolve(__dirname, "../public/og");

const W = 1200;
const H = 630;

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

function template(gauge, r) {
  const v = gaugeVerdict(gauge, r.value, r.prev);
  const pct = markerPct(gauge, r.value);
  const linePct = markerPct(gauge, gauge.keyLine.value);
  const segments = bandSegments(gauge);
  const takeaway = gauge.takeaway(r.value);

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
    h("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 8, background: v.accent } }),
    // eyebrow
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      h("div", { style: { fontFamily: mono, fontSize: 22, letterSpacing: 3, color: C.faint, textTransform: "uppercase" }, children: gauge.eyebrow }),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", fontSize: 24, fontWeight: 600, color: v.accent } },
        h("div", { style: { width: 14, height: 14, borderRadius: 99, background: v.accent, marginRight: 12 } }),
        v.label.toUpperCase()
      )
    ),
    // headline
    h("div", { style: { fontFamily: display, fontWeight: 700, fontSize: 56, color: C.text, marginTop: 40 }, children: gauge.headline }),
    // verdict
    h("div", { style: { fontFamily: display, fontWeight: 700, fontSize: 56, color: v.accent, marginTop: 8, lineHeight: 1.1 }, children: v.head }),
    // banded rail
    h(
      "div",
      { style: { display: "flex", position: "relative", height: 80, marginTop: 48 } },
      ...segments.map((s) =>
        h("div", {
          style: {
            position: "absolute", top: 40, height: 6, borderRadius: 6,
            left: `${s.start}%`, width: `${Math.max(0, s.end - s.start)}%`,
            background: s.accent, opacity: 0.4,
          },
        })
      ),
      // key line
      h("div", { style: { position: "absolute", top: 16, bottom: 16, left: `${linePct}%`, width: 4, background: C.muted } }),
      h("div", { style: { position: "absolute", top: -8, left: `${linePct}%`, fontFamily: mono, fontSize: 20, color: C.muted, display: "flex" }, children: gauge.keyLine.label }),
      // marker value
      h("div", { style: { position: "absolute", top: 52, left: `${pct}%`, transform: "translateX(-50%)", fontFamily: mono, fontWeight: 700, fontSize: 30, color: v.accent, display: "flex" }, children: fmt(gauge, r.value) })
    ),
    // takeaway
    h("div", { style: { fontFamily: display, fontWeight: 500, fontSize: 34, color: C.text, marginTop: 40, lineHeight: 1.3 }, children: takeaway }),
    h("div", { style: { display: "flex", flexGrow: 1 } }),
    // footer
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: mono, fontSize: 22, color: C.faint } },
      h("div", { style: { display: "flex" }, children: `${gauge.short} · ${r.computed ? "computed" : "illustrative"}` }),
      h("div", { style: { display: "flex", color: C.muted }, children: "econ.kpan.dev · by Kevin Pan" })
    )
  );
}

async function main() {
  const { gauges } = JSON.parse(await readFile(DATA, "utf8"));
  const fonts = await loadFonts();
  await mkdir(OUT_DIR, { recursive: true });

  let count = 0;
  for (const gauge of Object.values(GAUGES)) {
    const r = gauges[gauge.id];
    if (!r) continue;
    const svg = await satori(template(gauge, r), { width: W, height: H, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
    await writeFile(resolve(OUT_DIR, `${gauge.id}.png`), png);
    count++;
  }
  console.log(`✓ rendered ${count} gauge OG images → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
