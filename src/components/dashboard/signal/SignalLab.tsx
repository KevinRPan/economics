// STUB — owned by the Signal Lab workstream; replace with the real builder.
import type { HistoriesData } from "../../../lib/dashboard-types";

export interface SignalLabProps {
  histories: HistoriesData;
  /** gauge ids on the user's board — offered first in the indicator picker */
  boardIds: string[];
}

export default function SignalLab(_props: SignalLabProps) {
  return <section data-stub="signal-lab">Signal Lab coming soon.</section>;
}
