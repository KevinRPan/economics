// RSS feed of verdict changes — a band transition (Calm → Anxious,
// Frothy → Mania) is the site's news event, so that's what the feed carries.
// Until a card has recorded its first change, its current state (dated to the
// data's as-of month) seeds the feed so readers aren't handed an empty file.
import verdicts from "../data/verdicts.json";
import { GAUGES } from "../lib/gauges.mjs";

const SITE = "https://econ.kpan.dev";

const CARD_META = {
  recession: { name: "Recession (Sahm rule)", path: "/recession" },
  ...Object.fromEntries(
    Object.values(GAUGES).map((g) => [g.id, { name: g.headline, path: `/${g.slug}` }])
  ),
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function item({ title, link, date, description, guid }) {
  return [
    "    <item>",
    `      <title>${esc(title)}</title>`,
    `      <link>${esc(link)}</link>`,
    `      <guid isPermaLink="false">${esc(guid)}</guid>`,
    `      <pubDate>${new Date(date).toUTCString()}</pubDate>`,
    `      <description>${esc(description)}</description>`,
    "    </item>",
  ].join("\n");
}

export function GET() {
  const items = [];
  for (const [id, card] of Object.entries(verdicts.cards ?? {})) {
    const meta = CARD_META[id];
    if (!meta) continue;
    const changes = card.history ?? [];
    if (changes.length) {
      for (const c of changes) {
        items.push({
          title: `${meta.name} — ${c.fromLabel ?? c.from} → ${c.label}`,
          link: `${SITE}${meta.path}`,
          date: c.date,
          guid: `${id}:${c.date}:${c.to}`,
          description: `The ${meta.name} card moved from “${c.fromLabel ?? c.from}” to “${c.label}” (reading: ${c.value}).`,
        });
      }
    } else {
      items.push({
        title: `${meta.name} — ${card.label}`,
        link: `${SITE}${meta.path}`,
        date: card.asOf ?? verdicts.updated,
        guid: `${id}:initial:${card.key}`,
        description: `Current verdict: ${card.label} (reading: ${card.value}).`,
      });
    }
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>econ.kpan.dev — verdict changes</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>When an economic insight card changes its verdict band, it shows up here.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(verdicts.updated ?? Date.now()).toUTCString()}</lastBuildDate>
${items.map(item).join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
