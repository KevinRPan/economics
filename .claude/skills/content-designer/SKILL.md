---
name: content-designer
description: Use when writing or editing viewer-facing copy for econ.kpan.dev insight cards — eyebrows, headlines, verdicts, takeaways, methodology blurbs, band labels, or any shareable card text. Also use when adding a new card/gauge and naming its states.
---

# Content Designer — econ.kpan.dev house style

## Overview

Every card takes **one derived metric** and answers **one question a normal person actually asks**. The copy's job is to give an honest, screenshot-worthy read — not to manufacture drama. The number carries the alarm; the words stay calm and concrete.

Core principle: **say what's true plainly, let the reader feel the weight.** If the copy is louder than the data, you've broken trust — and trust is the whole product for a finance audience.

## The six slots (every card)

| Slot | Rule | Good example |
|------|------|--------------|
| **Eyebrow** | `Technical name · plain gloss`. Pair every jargon term with a 2–4 word translation. | `VIX · The Fear Gauge` · `Buffett Indicator · Market Cap ÷ GDP` |
| **Headline** | A plain-language yes/no **question** the reader already wonders. Always `Is…?` / `Are…?`. | `Are stocks in a bubble?` · `Is the market too calm?` |
| **Verdict head** | One short sentence answering the question for the current band. Direct, not breathless. | `Valuations are in a normal range.` · `Fear is spiking.` |
| **Takeaway** | The screenshot line: **one number + one plain consequence**. This is the deliverable. | `0.20 pts of headroom before the recession line.` |
| **Method blurb** | 2–3 sentences: what the metric is, how to read it, the honest caveat. Plus "what this isn't" bullets. | `It's a valuation gauge, not a timer — markets can stay 'expensive' for years.` |
| **Band labels** | Short scale words, calm → extreme. Loud words OK **here** because they read as scale points. | `Undervalued → Fair → Elevated → Frothy → Mania` |

## The one judgment call: editorial restraint

Band **labels** can be punchy ("Mania", "Fear", "peak greed") — they're clearly points on a scale. Verdict **sentences** must not be. State the read; don't editorialize the stakes.

| ❌ Manufactured alarm | ✅ Honest read |
|----------------------|----------------|
| "The recession clock has already started." | "Un-inverted — but historically the late stage, not the all-clear." |
| "This is froth — get out now." | "This is froth — stocks are pricey vs GDP." |
| "Investors are terrified." | "Fear is spiking." |

Test: would this sentence still be true and fair if the metric were *trending the other way next month?* If it only works as a scare, cut it.

## Always include the honest caveat

Finance copy earns trust by naming its own limits. Every card states what the metric is **not**:
- "It's a valuation gauge, not a timer."
- "Low VIX = complacency, not safety."
- "It's a warning, not a timer — recessions follow 6–18 months later, with wide misses."

## Adding a new card — checklist

1. Pick the **one question** a reader asks; write it as the headline (`Is…?`/`Are…?`).
2. Eyebrow = `technical name · plain gloss`.
3. Define bands calm→extreme with short scale labels and an accent each.
4. Write a calm verdict sentence **per band** (no manufactured stakes).
5. Write the numeric takeaway formula (value + plain consequence vs a key reference line).
6. Method blurb: what it is, how to read it, the caveat + 2–3 "what this isn't" bullets, data footnote (`FRED <SERIES>`).

## Common mistakes

- **Jargon with no gloss** in the eyebrow → reader bounces. Always translate.
- **Takeaway with no number** → not screenshot-worthy. The number is the point.
- **Verdict louder than the data** → reads as clickbait, kills trust.
- **URL/brand-speak or "built to be screenshotted" in viewer copy** → that's builder-speak; lead with what the reader learns.
- **Statement headlines** ("The recession signal") → use a question instead.

## Reference

The live implementation of this voice is `src/lib/gauges.mjs` and `src/lib/recession.mjs` (`heads`, `subs`, `bands`, `method`, `takeaway`). Read them for worked examples before writing a new card.
