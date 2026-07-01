import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { APP_COPY } from "../../lib/appCopy";
import { displayWcCareerTotal } from "../../lib/mergeWcCareerGoals";
import { useTopScorers2026 } from "../../store/selectors/tournamentStatsSelectors";
import { PlayerPhoto } from "./PlayerPhoto";
import { useEnrichedPlayerPhoto } from "../../hooks/useEnrichedPlayerPhoto";
import styles from "./PlayerStatPopover.module.css";

type Props = {
  playerName: string;
  teamId?: string;
  countryLabel?: string;
  goals2026?: number;
  children: ReactNode;
  className?: string;
};

function usePrefersHover(): boolean {
  const [prefersHover, setPrefersHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    setPrefersHover(mq.matches);
    const handler = () => setPrefersHover(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersHover;
}

export function PlayerStatPopover({
  playerName,
  teamId,
  countryLabel,
  goals2026,
  children,
  className = "",
}: Props) {
  const copy = APP_COPY.live.scorers;
  const topScorers = useTopScorers2026();
  const photoUrl = useEnrichedPlayerPhoto(playerName, teamId);
  const prefersHover = usePrefersHover();
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  const career = displayWcCareerTotal(playerName, topScorers);
  const resolvedGoals2026 = goals2026 ?? career.goals2026;

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const handleMouseEnter = () => {
    if (!prefersHover) return;
    clearHoverTimer();
    handleOpen();
  };

  const handleMouseLeave = () => {
    if (!prefersHover) return;
    clearHoverTimer();
    hoverTimer.current = setTimeout(handleClose, 150);
  };

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (prefersHover) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen((value) => !value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      handleClose();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (prefersHover) return;
      event.preventDefault();
      setOpen((value) => !value);
    }
  };

  useEffect(() => {
    if (!open || prefersHover) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [handleClose, open, prefersHover]);

  const subtitle = countryLabel ?? teamId?.toUpperCase();

  return (
    <span
      ref={wrapRef}
      className={`${styles.wrap} ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        {children}
      </button>

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          className={styles.popover}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className={styles.header}>
            <PlayerPhoto name={playerName} photoUrl={photoUrl} size="md" />
            <div className={styles.identity}>
              <strong className={styles.name}>{playerName}</strong>
              {subtitle ? <span className={styles.meta}>{subtitle}</span> : null}
            </div>
          </div>

          <dl className={styles.stats}>
            <div className={styles.statRow}>
              <dt>{copy.goalsThisTournament}</dt>
              <dd>{resolvedGoals2026}</dd>
            </div>
            <div className={styles.statRow}>
              <dt>{copy.careerWcGoals}</dt>
              <dd>{career.careerTotal}</dd>
            </div>
            {career.reference ? (
              <div className={styles.statRow}>
                <dt>{copy.through2022}</dt>
                <dd>{career.goalsBefore2026}</dd>
              </div>
            ) : null}
          </dl>

          {career.reference?.currently_playing_in_this_wc ? (
            <span className={styles.pill}>{copy.in2026}</span>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}
