import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { resolveVenueFromMatch } from "../../lib/venue/resolveVenue";
import { useStore } from "../../store";
import type { NavigationContext, TabId } from "../../types";
import { VenuePopover } from "./VenuePopover";
import styles from "./VenuePopover.module.css";

type Props = {
  matchId?: string;
  venueString?: string;
  compact?: boolean;
  inline?: boolean;
  nested?: boolean;
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

function navigationFromTab(tab: TabId): NavigationContext["from"] {
  switch (tab) {
    case "tournament":
    case "live":
    case "schedule":
    case "results":
    case "bracket":
    case "groups":
      return tab;
    default:
      return "live";
  }
}

export function VenueLabel({ matchId, venueString, compact, inline, nested, className }: Props) {
  const openVenueHub = useStore((s) => s.openVenueHub);
  const activeTab = useStore((s) => s.activeTab);
  const venue = useMemo(
    () => resolveVenueFromMatch(matchId, venueString),
    [matchId, venueString]
  );
  const prefersHover = usePrefersHover();
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

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

  const handleOpenHub = () => {
    if (!venue) return;
    handleClose();
    openVenueHub(venue.slug, { from: navigationFromTab(activeTab) });
  };

  const handleToggle = useCallback(
    (e?: MouseEvent | KeyboardEvent) => {
      e?.stopPropagation();
      if (open) {
        handleClose();
      } else {
        handleOpen();
      }
    },
    [open, handleClose, handleOpen]
  );

  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      handleToggle(e);
    },
    [handleToggle]
  );

  if (!venue) {
    if (venueString) {
      return <span className={className}>{venueString}</span>;
    }
    return null;
  }

  const mode = prefersHover ? "popover" : "sheet";

  const triggerContent = (
    <>
      <span className={styles.venueLabelStadium}>{venue.displayPrimary}</span>
      {!compact ? (
        inline ? (
          <>
            <span className={styles.venueLabelSep}>·</span>
            <span className={styles.venueLabelCity}>{venue.hostCity}</span>
          </>
        ) : (
          <span className={styles.venueLabelCity}>{venue.hostCity}</span>
        )
      ) : null}
    </>
  );

  const triggerProps = {
    className: styles.venueLabelTrigger,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
    onClick: (e: MouseEvent) => handleToggle(e),
    onFocus: prefersHover ? handleOpen : undefined,
    onBlur: prefersHover ? () => (hoverTimer.current = setTimeout(handleClose, 150)) : undefined,
    ...(nested
      ? { role: "button" as const, tabIndex: 0, onKeyDown: handleTriggerKeyDown }
      : {}),
  };

  return (
    <span
      ref={wrapRef}
      className={`${styles.venueLabel} ${compact ? styles["venueLabel--compact"] : ""} ${inline ? styles["venueLabel--inline"] : ""} ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {nested ? (
        <span {...triggerProps}>{triggerContent}</span>
      ) : (
        <button type="button" {...triggerProps}>
          {triggerContent}
        </button>
      )}
      <VenuePopover
        venue={venue}
        open={open}
        mode={mode}
        anchorRef={wrapRef}
        onClose={handleClose}
        onOpenHub={handleOpenHub}
      />
    </span>
  );
}
