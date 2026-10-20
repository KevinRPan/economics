/* ───────────────────────────────────────────────────────────────────────────
   Build-time OG/share image generator for Signal Lab presets.

   One 1200×630 PNG per preset recipe.
   Satori renders the share card template — scorecard sentence, recipe formula,
   status badge, and branding — and resvg rasterizes it to
   public/og/signal-{preset}.png.
─────────────────────────────────────────────────────────────────────────── */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { C } from "../src/lib/gauges.mjs";
import { PRESETS } from "../src/lib/signal-presets.mjs";
import { evaluate } from "../src/lib/backtest.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORIES_FILE = resolve(__dirname, "../src/data/histories.json");
const OUT_DIR = resolve(__dirname, "../public/og");

const W = 1200;
const H = 630;

function h(type, props = {}, ...children) {
  const { children: propChildren, style, ...rest } = props;
  const kids = children.length ? children.flat() : propChildren;
  const mergedStyle = type === "div" ? { display: "flex", ...style } : style;
  return {
    type,
    props: {
      ...rest,
      ...(style !== undefined || type === "div" ? { style: mergedStyle } : {}),
      ...(kids !== undefined ? { children: kids } : {}),
    },
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

const TARGET_NOUNS = {
  recession: "recessions",
  bear: "stock crashes",
  joblessjump: "unemployment jumps",
  inflation: "inflation spikes",
  housing: "housing drops",
  fedcuts: "Fed cut cycles",
};

function formatScorecard(result, target) {
  const { summary } = result;
  const noun = TARGET_NOUNS[target] || "events";

  if (!summary || summary.total === 0) {
    return null;
  }

  const parts = [`Caught ${summary.caught} of ${summary.total} ${noun}`];
  if (summary.avgLead !== null) {
    parts.push(`avg ${summary.avgLead} months early`);
  }
  const faNoun = summary.falseAlarms === 1 ? "false alarm" : "false alarms";
  parts.push(`${summary.falseAlarms} ${faNoun}`);
  if (summary.pending > 0) {
    parts.push(`${summary.pending} pending`);
  }
  return parts.join(" · ");
}

function template(preset, result) {
  const mono = "JetBrains Mono";
  const display = "Bricolage Grotesque";

  const scorecardSentence = result ? formatScorecard(result, preset.signal.target) : null;
  const headline = scorecardSentence || preset.title;
  const subline = scorecardSentence ? preset.title : preset.description;
  const isFiring = result ? result.isFiringNow : false;
  const accent = isFiring ? C.red : C.green;

  const targetLabel = (TARGET_NOUNS[preset.signal.target] || preset.signal.target).toUpperCase();

  const condsText = preset.signal.conditions
    .map((c) => `${c.indicator.toUpperCase()} (${c.bands.join(", ")})`)
    .join(" + ");

  return h(
    "div",
    {
      style: {
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        background: C.panel,
        color: C.text,
        padding: "56px 64px",
        fontFamily: "Inter",
        position: "relative",
      },
    },
    // Top accent bar
    h("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        background: accent,
      },
    }),
    // Eyebrow row
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      h(
        "div",
        {
          style: {
            fontFamily: mono,
            fontSize: 18,
            letterSpacing: 2,
            color: C.faint,
            textTransform: "uppercase",
          },
        },
        "SIGNAL LAB · MACRO CROSS-SIGNAL"
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            fontSize: 18,
            fontWeight: 600,
            fontFamily: mono,
            color: accent,
          },
        },
        h("div", {
          style: {
            width: 10,
            height: 10,
            borderRadius: 99,
            background: accent,
            marginRight: 8,
          },
        }),
        isFiring ? "FIRING NOW" : "CALM / NOT FIRING"
      )
    ),
    // Headline (Scorecard or Title)
    h(
      "div",
      {
        style: {
          fontFamily: display,
          fontWeight: 700,
          fontSize: 46,
          color: C.text,
          marginTop: 32,
          lineHeight: 1.15,
        },
      },
      headline
    ),
    // Subline
    h(
      "div",
      {
        style: {
          fontFamily: display,
          fontWeight: 500,
          fontSize: 26,
          color: C.muted,
          marginTop: 8,
          lineHeight: 1.25,
        },
      },
      subline
    ),
    // Formula / Recipe Panel
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          background: C.raised,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "20px 24px",
          marginTop: 28,
        },
      },
      h(
        "div",
        {
          style: {
            fontFamily: mono,
            fontSize: 14,
            color: C.faint,
            textTransform: "uppercase",
            marginBottom: 6,
          },
        },
        `RECIPE (TARGET: ${targetLabel})`
      ),
      h(
        "div",
        {
          style: {
            fontFamily: mono,
            fontSize: 22,
            fontWeight: 700,
            color: accent,
          },
        },
        condsText
      ),
      h(
        "div",
        {
          style: {
            fontFamily: mono,
            fontSize: 15,
            color: C.muted,
            marginTop: 8,
          },
        },
        `Hold: ${preset.signal.holdMonths > 0 ? `${preset.signal.holdMonths} mo` : "immediate"}  ·  Lead window: ${preset.signal.windowMonths} mo`
      )
    ),
    h("div", { style: { display: "flex", flexGrow: 1 } }),
    // Footer
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: mono,
          fontSize: 18,
          color: C.faint,
        },
      },
      h("div", { style: { display: "flex" } }, `econ.kpan.dev/signals/${preset.slug}`),
      h("div", { style: { display: "flex", color: C.muted } }, "econ.kpan.dev · by Kevin Pan")
    )
  );
}

async function main() {
  let histories = null;
  if (existsSync(HISTORIES_FILE)) {
    try {
      histories = JSON.parse(await readFile(HISTORIES_FILE, "utf8"));
    } catch {
      // ignore
    }
  }

  const fonts = await loadFonts();
  await mkdir(OUT_DIR, { recursive: true });

  let count = 0;
  for (const preset of PRESETS) {
    const result = histories ? evaluate(preset.signal, histories) : null;
    const svg = await satori(template(preset, result), { width: W, height: H, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
    const outPath = resolve(OUT_DIR, `signal-${preset.slug}.png`);
    await writeFile(outPath, png);
    count++;
  }

  console.log(`✓ rendered ${count} signal preset OG images → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
