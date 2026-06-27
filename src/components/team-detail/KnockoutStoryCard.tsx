import { APP_COPY } from "../../lib/appCopy";
import type { EliminationStory } from "../../lib/eliminationStory";
import { useStore } from "../../store";

type Props = {
  story: EliminationStory;
  teamId: string;
  onViewFixtures: () => void;
};

export function KnockoutStoryCard({ story, teamId, onViewFixtures }: Props) {
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const copy = APP_COPY.knockoutStory;

  if (story.confidence === "unknown") {
    return null;
  }

  return (
    <section className="knockout-story-card" aria-labelledby={`knockout-story-${teamId}`}>
      <h3 id={`knockout-story-${teamId}`}>{copy.cardTitle}</h3>

      {story.confidence === "full" && story.decidingLabel ? (
        <>
          <p>
            {copy.fullIntro} <strong>{story.decidingLabel}</strong> changed the table.
          </p>
          {story.reason ? (
            <p>
              {copy.fullReason} {story.reason}
            </p>
          ) : null}
          {story.aliveSpan ? (
            <p>
              {copy.fullAliveSpan} {story.aliveSpan} before the final cutoff.
            </p>
          ) : null}
          <p>{copy.fullFooter}</p>
        </>
      ) : (
        <>
          <p>{copy.partialLead}</p>
          {story.reason ? <p>{story.reason}</p> : null}
          <p>{copy.partialFooter}</p>
        </>
      )}

      {story.knownFacts.length > 0 ? (
        <div className="knockout-story-known">
          <h4>{copy.partialKnownFacts}</h4>
          <ul>
            {story.knownFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {story.timeline.length > 0 ? (
        <div className="knockout-story-timeline">
          <h4>{copy.timelineHeading}</h4>
          <ul>
            {story.timeline.map((entry) => (
              <li key={`${entry.matchId}-${entry.label}`}>
                {entry.matchId ? (
                  <button
                    type="button"
                    className="knockout-story-link"
                    onClick={() => openMatchDetail(entry.matchId, { from: "live" })}
                  >
                    {entry.label}
                  </button>
                ) : (
                  entry.label
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="knockout-story-actions">
        {story.decidingMatchId ? (
          <button
            type="button"
            className="knockout-story-btn"
            onClick={() => openMatchDetail(story.decidingMatchId!, { from: "live" })}
          >
            {copy.viewDecidingMatch}
          </button>
        ) : null}
        <button type="button" className="knockout-story-btn" onClick={onViewFixtures}>
          {copy.viewAllFixtures}
        </button>
      </div>
    </section>
  );
}
