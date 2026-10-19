// STUB — owned by the Stream workstream; replace with the real feed.
import type { StreamItem } from "../../../lib/dashboard-types";

export interface StreamProps {
  items: StreamItem[];
  /** gauge ids on the user's board — the stream may highlight/filter to these */
  boardIds: string[];
}

export default function Stream(_props: StreamProps) {
  return <section data-stub="stream">Stream coming soon.</section>;
}
