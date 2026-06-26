import { BracketView } from "../../../../components/views/BracketView";
import styles from "../../TournamentView.module.css";

/**
 * Reuses the existing BracketView which already renders the full knockout tree.
 * Phase 5 polish will add zoom/pan via a transform wrapper.
 */
export function TournamentBracketTab() {
  return (
    <div className={styles.tabPanel}>
      <BracketView />
    </div>
  );
}
