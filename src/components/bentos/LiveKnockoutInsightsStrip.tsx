import { useEffect } from "react";
import { ensurePlayerDatabase } from "../../data/playerDatabase";
import { ensurePaninarrCatalogLoaded } from "../../services/paninarr/ImageAssetService";
import { APP_COPY } from "../../lib/appCopy";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import {
  useActiveCareerLeaders,
  useAllTimeCareerLeaders,
  useTopScorers2026,
} from "../../store/selectors/tournamentStatsSelectors";
import { KnockoutRoundStatusPanel, useKnockoutRoundSummaries } from "./KnockoutRoundStatusBento";
import { ActiveWcCareerScorersBento } from "./scorerBentos/ActiveWcCareerScorersBento";
import { AllTimeWcScorersBento } from "./scorerBentos/AllTimeWcScorersBento";
import { TournamentPulseBento } from "./TournamentPulseBento";
import { Tournament2026ScorersBento } from "./scorerBentos/Tournament2026ScorersBento";
import styles from "./LiveKnockoutInsightsStrip.module.css";

export function LiveKnockoutInsightsStrip() {
  const { isKnockoutActive } = useTournamentPhase();
  const summaries = useKnockoutRoundSummaries();
  const topScorers2026 = useTopScorers2026();
  const activeCareerLeaders = useActiveCareerLeaders(10);
  const allTimeLeaders = useAllTimeCareerLeaders(5);

  useEffect(() => {
    void ensurePlayerDatabase();
    void ensurePaninarrCatalogLoaded();
  }, []);

  if (!isKnockoutActive) return null;

  const copy = APP_COPY.live;

  return (
    <section className={styles.root} aria-label={copy.insightsStripAria}>
      <div className={styles.scroll}>
        <TournamentPulseBento />
        {summaries.length > 0 ? <KnockoutRoundStatusPanel summaries={summaries} /> : null}
        <Tournament2026ScorersBento scorers={topScorers2026} />
        <ActiveWcCareerScorersBento leaders={activeCareerLeaders} />
        <AllTimeWcScorersBento leaders={allTimeLeaders} />
      </div>
    </section>
  );
}
