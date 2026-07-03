// Publishes the verdict-change history at /data/verdicts.json so the NEXT
// build can diff against this deploy's state (see scripts/gen-verdicts.mjs).
// Doubles as a tiny free API for anyone who wants the current verdicts.
import verdicts from "../../data/verdicts.json";

export function GET() {
  return new Response(JSON.stringify(verdicts, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
