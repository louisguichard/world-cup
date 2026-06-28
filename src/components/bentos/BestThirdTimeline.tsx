/** Best-third ranking timeline slider with chart, playback, and snapshot table. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRankingTimeline } from "../../hooks/useRankingTimeline";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { BestThirdTimelineChart } from "./BestThirdTimelineChart";
import { BestThirdTimelineTable } from "./BestThirdTimelineTable";
import { TIMELINE_CHART_COLORS } from "./bestThirdTimelineConstants";
import styles from "./BestThirdTimeline.module.css";

const PLAY_SPEEDS = [1, 2, 4] as const;

export function BestThirdTimeline() {
  const { snapshots, presentIndex, hasData } = useRankingTimeline();
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const [sliderIndex, setSliderIndex] = useState(presentIndex);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<(typeof PLAY_SPEEDS)[number]>(1);
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const [lockedTeamId, setLockedTeamId] = useState<string | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSliderIndex(presentIndex);
  }, [presentIndex]);

  useEffect(() => {
    if (!playing) {
      if (playRef.current) clearInterval(playRef.current);
      playRef.current = null;
      return;
    }

    playRef.current = setInterval(() => {
      setSliderIndex((current) => {
        if (current >= presentIndex) {
          setPlaying(false);
          return presentIndex;
        }
        return current + 1;
      });
    }, 600 / playSpeed);

    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, playSpeed, presentIndex]);

  const snapshot = snapshots[sliderIndex];
  const teamColors = useMemo(() => {
    const seed = snapshots.find((entry) => entry.rankings.length > 0)?.rankings ?? [];
    return Object.fromEntries(
      seed.slice(0, 12).map((row, index) => [row.teamId, TIMELINE_CHART_COLORS[index % TIMELINE_CHART_COLORS.length]])
    );
  }, [snapshots]);

  const handleStepBack = useCallback(() => {
    setPlaying(false);
    setSliderIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setPlaying(false);
    setSliderIndex((current) => Math.min(presentIndex, current + 1));
  }, [presentIndex]);

  const handleJumpToPresent = useCallback(() => {
    setPlaying(false);
    setSliderIndex(presentIndex);
  }, [presentIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== rootRef.current) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handleStepBack();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleStepForward();
          break;
        case "Home":
          event.preventDefault();
          setPlaying(false);
          setSliderIndex(0);
          break;
        case "End":
          event.preventDefault();
          handleJumpToPresent();
          break;
        default:
          break;
      }
    },
    [handleStepBack, handleStepForward, handleJumpToPresent]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!hasData || !snapshot) return null;

  const tl = APP_COPY.bestThirdTimeline;
  const bt = APP_COPY.bestThird;

  const scoringDelta = snapshot.scoringTeamId
    ? snapshot.deltas.find((delta) => delta.teamId === snapshot.scoringTeamId)
    : undefined;

  const positionArrow =
    scoringDelta && scoringDelta.positionBefore > scoringDelta.positionAfter
      ? "↑"
      : scoringDelta && scoringDelta.positionBefore < scoringDelta.positionAfter
        ? "↓"
        : "→";

  const positionArrowClass =
    scoringDelta && scoringDelta.positionBefore > scoringDelta.positionAfter
      ? styles.deltaUp
      : scoringDelta && scoringDelta.positionBefore < scoringDelta.positionAfter
        ? styles.deltaDown
        : styles.deltaFlat;

  return (
    <section
      ref={rootRef}
      className={`${styles.timeline} best-third-timeline`}
      aria-label={tl.title}
      tabIndex={0}
    >
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{tl.title}</h2>
          <p className={styles.subtitle}>{tl.subtitle}</p>
        </div>
        {snapshot.type === "present" ? (
          <span className={styles.liveBadge}>
            <span aria-hidden>●</span> {tl.liveBadge}
          </span>
        ) : null}
      </header>

      <p className={styles.contextLabel}>{snapshot.label}</p>

      <BestThirdTimelineChart
        snapshots={snapshots}
        sliderIndex={sliderIndex}
        teams={teams}
        highlightedTeamId={highlightedTeamId}
        lockedTeamId={lockedTeamId}
        onHighlightTeam={setHighlightedTeamId}
        onLockTeam={setLockedTeamId}
      />

      <div className={styles.sliderWrap}>
        <input
          type="range"
          min={0}
          max={Math.max(0, snapshots.length - 1)}
          value={sliderIndex}
          onChange={(event) => {
            setPlaying(false);
            setSliderIndex(Number(event.target.value));
          }}
          onMouseDown={() => setPlaying(false)}
          onTouchStart={() => setPlaying(false)}
          className={styles.slider}
          aria-label="Timeline position"
          aria-valuetext={snapshot.label}
        />
      </div>

      <div className={styles.tickRow} aria-hidden>
        {snapshots.map((entry, index) => {
          if (entry.type !== "match-start" && entry.type !== "goal" && entry.type !== "final-whistle") {
            return null;
          }

          const leftPct = snapshots.length > 1 ? (index / (snapshots.length - 1)) * 100 : 0;
          const tickClass =
            entry.type === "match-start"
              ? styles["tick--match-start"]
              : entry.type === "final-whistle"
                ? styles["tick--final-whistle"]
                : `${styles.tick} ${styles["tick--goal"]}`;

          const style =
            entry.type === "goal" && entry.scoringTeamId
              ? { left: `${leftPct}%`, background: teamColors[entry.scoringTeamId] ?? "var(--accent)" }
              : { left: `${leftPct}%` };

          return (
            <button
              key={entry.id}
              type="button"
              className={tickClass}
              style={style}
              onClick={() => {
                setPlaying(false);
                setSliderIndex(index);
              }}
              aria-label={entry.shortLabel}
            />
          );
        })}
      </div>

      <div className={styles.controls}>
        <button type="button" onClick={handleStepBack} aria-label={tl.stepBack}>
          ⏮
        </button>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? tl.pause : tl.play}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button type="button" onClick={handleStepForward} aria-label={tl.stepForward}>
          ⏭
        </button>
        <button type="button" onClick={handleJumpToPresent} aria-label={tl.jumpToNow}>
          ⏩ Now
        </button>
        <span className={styles.speedControl}>
          {tl.speed}:
          {PLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={playSpeed === speed ? styles.speedActive : ""}
              onClick={() => setPlaySpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </span>
      </div>

      <div
        className={`${styles.callout} ${snapshot.type === "goal" ? styles.calloutGoal : ""}`}
      >
        {snapshot.type === "goal" && snapshot.scoringTeamId ? (
          <>
            <TeamFlag team={teams[snapshot.scoringTeamId]} teamId={snapshot.scoringTeamId} size="sm" />
            <span>
              {tl.scored(
                teamDisplayNameFromId(snapshot.scoringTeamId, teams),
                `${snapshot.homeScore}–${snapshot.awayScore}`,
                Math.round(snapshot.minute)
              )}
            </span>
            {scoringDelta ? (
              <span className={positionArrowClass}>
                {tl.movedRank(scoringDelta.positionBefore, scoringDelta.positionAfter)} {positionArrow}
              </span>
            ) : null}
          </>
        ) : null}

        {snapshot.type === "match-start" ? (
          <span>
            {tl.matchStart(
              teamDisplayNameFromId(snapshot.homeTeamId, teams),
              teamDisplayNameFromId(snapshot.awayTeamId, teams),
              snapshot.group
            )}
          </span>
        ) : null}

        {snapshot.type === "final-whistle" ? (
          <span>
            {tl.fullTime(
              teamDisplayNameFromId(snapshot.homeTeamId, teams),
              `${snapshot.homeScore}–${snapshot.awayScore}`,
              teamDisplayNameFromId(snapshot.awayTeamId, teams),
              snapshot.deltas.filter((delta) => delta.positionBefore !== delta.positionAfter).length
            )}
          </span>
        ) : null}

        {snapshot.type === "present" ? (
          <>
            <span className={styles.liveBadge}>
              <span aria-hidden>●</span> {bt.liveBadge}
            </span>
            <span>{tl.currentStandings}</span>
          </>
        ) : null}
      </div>

      <BestThirdTimelineTable snapshot={snapshot} teams={teams} standings={standings} />

      <div className={styles.legend}>
        {Object.entries(teamColors).map(([teamId, color]) => (
          <span key={teamId} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: color }} aria-hidden />
            <TeamFlag team={teams[teamId]} teamId={teamId} size="sm" compact />
            {teamDisplayNameFromId(teamId, teams)}
          </span>
        ))}
      </div>
    </section>
  );
}
