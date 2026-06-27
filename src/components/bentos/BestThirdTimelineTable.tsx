/** Mini ranking table for a single timeline snapshot. */
import type { RankingSnapshot } from "../../lib/buildRankingTimeline";
import type { GroupStanding, Team } from "../../types";
import { BestThirdRankingTable } from "./BestThirdRankingTable";

type Props = {
  snapshot: RankingSnapshot;
  teams: Record<string, Team>;
  standings?: GroupStanding[];
};

export function BestThirdTimelineTable({ snapshot, teams, standings = [] }: Props) {
  return (
    <BestThirdRankingTable snapshot={snapshot} teams={teams} standings={standings} />
  );
}
