import { APP_COPY } from "../../lib/appCopy";
import { useTournamentPulse } from "../../store/selectors/tournamentPulseSelectors";
import styles from "./scorerBentos/ScorerBentos.module.css";
import pulseStyles from "./TournamentPulseBento.module.css";

type StatProps = {
  label: string;
  value: number | string;
  hint?: string;
};

function StatCell({ label, value, hint }: StatProps) {
  return (
    <div className={pulseStyles.stat}>
      <span className={pulseStyles.statLabel}>{label}</span>
      <span className={pulseStyles.statValue}>{value}</span>
      {hint ? <span className={pulseStyles.statHint}>{hint}</span> : null}
    </div>
  );
}

export function TournamentPulseBento() {
  const copy = APP_COPY.live.pulse;
  const pulse = useTournamentPulse();

  const showCoverageNote =
    pulse.eventCoverage.completedTotal > 0 &&
    pulse.eventCoverage.completedWithEvents < pulse.eventCoverage.completedTotal;

  return (
    <article className={`${styles.panel} ${pulseStyles.panel}`} aria-label={copy.ariaLabel}>
      <header className={styles.header}>
        <span className={styles.kicker}>{copy.kicker}</span>
        <h3 className={styles.title}>{copy.title}</h3>
      </header>

      <div className={pulseStyles.grid}>
        <StatCell
          label={copy.teamsLeft}
          value={pulse.teamsLeft}
          hint={pulse.teamsLeftLabel}
        />
        <StatCell label={copy.matchesPlayed} value={pulse.matchesPlayed} />
        <StatCell label={copy.matchesRemaining} value={pulse.matchesRemaining} />
        <StatCell label={copy.totalGoals} value={pulse.totalGoals} />
        <StatCell label={copy.yellowCards} value={pulse.yellowCards} />
        <StatCell label={copy.redCards} value={pulse.redCards} />
      </div>

      {showCoverageNote ? (
        <p className={pulseStyles.note}>
          {copy.cardsCoverage(
            pulse.eventCoverage.completedWithEvents,
            pulse.eventCoverage.completedTotal
          )}
        </p>
      ) : null}
    </article>
  );
}
