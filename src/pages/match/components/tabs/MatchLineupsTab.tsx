import type { Lineup, MatchStatus } from "../../../../types";
import { MatchTabEmptyState } from "../../../../components/shared/MatchTabEmptyState";
import { PitchDiagram } from "../lineups/PitchDiagram";
import { SubstitutesBench } from "../lineups/SubstitutesBench";
import { ManagerRow } from "../lineups/ManagerRow";
import { FormationPill } from "../lineups/FormationPill";
import styles from "../../MatchDetailView.module.css";

type Props = {
  lineups: Lineup[];
  loading: boolean;
  homeTeamName: string;
  awayTeamName: string;
  matchStatus?: MatchStatus;
};

export function MatchLineupsTab({ lineups, loading, homeTeamName, awayTeamName, matchStatus }: Props) {
  if (loading && lineups.length === 0) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ height: i === 0 ? 200 : 16 }} />
          ))}
        </div>
      </div>
    );
  }

  if (lineups.length === 0) {
    const isUpcoming = matchStatus === "scheduled" || matchStatus === undefined;
    return (
      <MatchTabEmptyState
        title={isUpcoming ? "Lineups not yet announced." : "Lineups unavailable."}
        detail={
          isUpcoming
            ? "Starting elevens are usually published about an hour before kickoff (WC Live or SofaScore)."
            : "Lineups may not be published yet, or no feed returned squad data for this fixture."
        }
      />
    );
  }

  const homeLineup = lineups.find((l) => l.team === "home");
  const awayLineup = lineups.find((l) => l.team === "away");

  return (
    <div className={styles.tabPanel}>
      {/* Formation pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--ss-muted)" }}>{homeTeamName}</span>
          {homeLineup && <FormationPill formation={homeLineup.formation} />}
        </div>
        <span style={{ fontSize: 12, color: "var(--ss-muted)" }}>vs</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span style={{ fontSize: 11, color: "var(--ss-muted)" }}>{awayTeamName}</span>
          {awayLineup && <FormationPill formation={awayLineup.formation} />}
        </div>
      </div>

      {/* Pitch diagram */}
      {homeLineup && awayLineup && (
        <PitchDiagram homeLineup={homeLineup} awayLineup={awayLineup} />
      )}

      {/* Managers */}
      <div style={{ marginTop: 16 }}>
        {homeLineup?.manager && (
          <ManagerRow team="home" manager={homeLineup.manager} teamName={homeTeamName} />
        )}
        {awayLineup?.manager && (
          <ManagerRow team="away" manager={awayLineup.manager} teamName={awayTeamName} />
        )}
      </div>

      {/* Substitutes bench */}
      {(homeLineup?.substitutes.length ?? 0) > 0 ||
      (awayLineup?.substitutes.length ?? 0) > 0 ? (
        <SubstitutesBench
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
        />
      ) : null}
    </div>
  );
}
