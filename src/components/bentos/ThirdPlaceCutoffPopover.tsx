import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { APP_COPY } from "../../lib/appCopy";
import type { CutoffScenario } from "../../lib/thirdPlaceCutoffScenario";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import type { Team } from "../../types";
import { TeamFlag } from "../team/TeamFlag";
import venueStyles from "../venue/VenuePopover.module.css";
import styles from "./ThirdPlaceCutoffPopover.module.css";

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

type PanelProps = {
  scenario: CutoffScenario;
  teams: Record<string, Team>;
  titleId: string;
  onClose: () => void;
};

function CutoffPopoverPanel({ scenario, teams, titleId, onClose }: PanelProps) {
  const cp = APP_COPY.cutoffPopover;
  const tbl = APP_COPY.table;

  return (
    <>
      <div className={venueStyles.popoverHead}>
        <h3 id={titleId} className={venueStyles.popoverTitle}>
          {cp.title}
        </h3>
        <button type="button" className={venueStyles.popoverClose} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className={styles.prose}>
        {scenario.proseLines.slice(1).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <dl className={styles.summary}>
        <dt>{cp.statsHeading}</dt>
        <dd>
          #{scenario.rank} · {scenario.points} {tbl.points.toLowerCase()} · {tbl.goalDiff}{" "}
          {scenario.goalDifference >= 0 ? "+" : ""}
          {scenario.goalDifference} · {tbl.goalsFor} {scenario.goalsFor}
        </dd>
        <dt>{cp.keepHeading}</dt>
        <dd>{scenario.keepSummary}</dd>
        <dt>{cp.knockHeading}</dt>
        <dd>
          <ul>
            {scenario.knockOutBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </dd>
        <dt>Minimum drop</dt>
        <dd>{scenario.minDropSummary}</dd>
        {scenario.watchTeams.length > 0 ? (
          <>
            <dt>{cp.watchHeading}</dt>
            <dd>
              <ul>
                {scenario.watchTeams.map((w) => (
                  <li key={w.teamId}>
                    <TeamFlag team={teams[w.teamId]} teamId={w.teamId} size="sm" compact />{" "}
                    {teamDisplayNameFromId(w.teamId, teams)} — #{w.rank}, {w.points} pts
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>
    </>
  );
}

type Props = {
  scenario: CutoffScenario;
  teams: Record<string, Team>;
  anchorRef: RefObject<HTMLElement | null>;
};

export function ThirdPlaceCutoffPopover({ scenario, teams, anchorRef }: Props) {
  const prefersHover = usePrefersHover();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);
  const handleOpen = useCallback(() => setOpen(true), []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !panelRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.left = `${Math.max(8, rect.left)}px`;
  }, [open, anchorRef, scenario.teamId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const infoButton = (
    <button
      type="button"
      className={styles.infoBtn}
      aria-label={APP_COPY.cutoffPopover.infoLabel}
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onMouseEnter={() => {
        if (!prefersHover) return;
        clearHoverTimer();
        handleOpen();
      }}
      onMouseLeave={() => {
        if (!prefersHover) return;
        clearHoverTimer();
        hoverTimer.current = setTimeout(handleClose, 150);
      }}
    >
      ⓘ
    </button>
  );

  const panel =
    open && anchorRef.current ? (
      createPortal(
        <div
          className={venueStyles.popoverBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            ref={panelRef}
            className={`${venueStyles.popoverPanel} ${styles.panel}`}
            role="dialog"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => prefersHover && clearHoverTimer()}
            onMouseLeave={() => {
              if (!prefersHover) return;
              clearHoverTimer();
              hoverTimer.current = setTimeout(handleClose, 150);
            }}
          >
            <CutoffPopoverPanel
              scenario={scenario}
              teams={teams}
              titleId={titleId}
              onClose={handleClose}
            />
          </div>
        </div>,
        document.body
      )
    ) : null;

  return (
    <>
      {infoButton}
      {panel}
    </>
  );
}

export function CutoffRowHoverWrap({
  children,
  scenario,
  teams,
}: {
  children: ReactNode;
  scenario: CutoffScenario;
  teams: Record<string, Team>;
}) {
  const prefersHover = usePrefersHover();
  const anchorRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !panelRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    let top = rect.bottom + 6;
    if (top + 320 > window.innerHeight) top = rect.top - 320 - 6;
    panel.style.top = `${Math.max(8, top)}px`;
    panel.style.left = `${Math.max(8, rect.left)}px`;
  }, [open]);

  if (!prefersHover) {
    return (
      <div ref={anchorRef} className={styles.rowWrap}>
        {children}
        <ThirdPlaceCutoffPopover scenario={scenario} teams={teams} anchorRef={anchorRef} />
      </div>
    );
  }

  return (
    <div
      ref={anchorRef}
      className={styles.rowWrap}
      onMouseEnter={() => {
        clearHoverTimer();
        setOpen(true);
      }}
      onMouseLeave={() => {
        clearHoverTimer();
        hoverTimer.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      {children}
      {open
        ? createPortal(
            <div className={venueStyles.popoverBackdrop} style={{ pointerEvents: "none" }}>
              <div
                ref={panelRef}
                className={`${venueStyles.popoverPanel} ${styles.panel}`}
                style={{ pointerEvents: "auto", position: "fixed" }}
                role="dialog"
                aria-labelledby={titleId}
              >
                <CutoffPopoverPanel
                  scenario={scenario}
                  teams={teams}
                  titleId={titleId}
                  onClose={() => setOpen(false)}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
