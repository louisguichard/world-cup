import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { ResolvedVenue } from "../../lib/venue/types";
import styles from "./VenuePopover.module.css";

type VenueDetailRowsProps = {
  venue: ResolvedVenue;
};

function VenueDetailRows({ venue }: VenueDetailRowsProps) {
  const rows: Array<{ label: string; value: string }> = [];
  if (venue.stadiumLocation) rows.push({ label: "Location", value: venue.stadiumLocation });
  rows.push({ label: "City", value: venue.city });
  if (venue.state) rows.push({ label: "State", value: venue.state });
  if (venue.county) rows.push({ label: "County", value: venue.county });
  rows.push({ label: "FIFA name", value: venue.fifaOfficialName });
  if (venue.formerStadiumName && venue.formerStadiumName !== venue.stadiumName) {
    rows.push({ label: "Former name", value: venue.formerStadiumName });
  }
  if (venue.capacity) rows.push({ label: "Capacity", value: venue.capacity.toLocaleString() });
  rows.push({ label: "Timezone", value: venue.timezone });

  return (
    <div className={styles.detailGrid}>
      {rows.map((row) => (
        <div key={row.label} className={styles.detailRow}>
          <span className={styles.detailLabel}>{row.label}</span>
          <span className={styles.detailValue}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

type VenuePopoverPanelProps = {
  venue: ResolvedVenue;
  onClose: () => void;
  onOpenHub: () => void;
  titleId: string;
  showHubCta?: boolean;
};

export function VenuePopoverPanel({
  venue,
  onClose,
  onOpenHub,
  titleId,
  showHubCta = true
}: VenuePopoverPanelProps) {
  return (
    <>
      <div className={styles.popoverHead}>
        <h3 id={titleId} className={styles.popoverTitle}>
          {venue.displayPrimary}
        </h3>
        <button type="button" className={styles.popoverClose} onClick={onClose} aria-label="Close venue details">
          ×
        </button>
      </div>
      <p className={styles.detailValue} style={{ margin: "0 0 10px", fontSize: "0.8rem" }}>
        {venue.hostCity} · {venue.country}
      </p>
      <VenueDetailRows venue={venue} />
      {showHubCta ? (
        <button type="button" className={styles.hubCta} onClick={onOpenHub}>
          All matches at this venue
        </button>
      ) : null}
    </>
  );
}

type PopoverPosition = {
  top: number;
  left: number;
};

function computePopoverPosition(anchor: HTMLElement, panelHeightEstimate = 320): PopoverPosition {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  const minWidth = 280;
  let top = rect.bottom + gap;
  let left = rect.left;

  if (top + panelHeightEstimate > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - panelHeightEstimate - gap);
  }

  left = Math.min(left, window.innerWidth - minWidth - margin);
  left = Math.max(margin, left);

  return { top, left };
}

type VenuePopoverProps = {
  venue: ResolvedVenue;
  open: boolean;
  mode: "popover" | "sheet";
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onOpenHub: () => void;
};

export function VenuePopover({ venue, open, mode, anchorRef, onClose, onOpenHub }: VenuePopoverProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || mode !== "popover" || !anchorRef.current) return;

    const update = () => {
      if (!anchorRef.current) return;
      const height = panelRef.current?.offsetHeight ?? 320;
      setPopoverPos(computePopoverPosition(anchorRef.current, height));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, mode, anchorRef, venue.slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || mode !== "sheet") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mode]);

  if (!open) return null;

  const panel = (
    <div
      ref={panelRef}
      className={mode === "sheet" ? styles.sheetPanel : styles.popoverPanel}
      role="dialog"
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
    >
      <VenuePopoverPanel venue={venue} onClose={onClose} onOpenHub={onOpenHub} titleId={titleId} />
    </div>
  );

  const overlay =
    mode === "sheet" ? (
      <div
        className={styles.sheetBackdrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {panel}
      </div>
    ) : (
      <div
        className={styles.popoverBackdrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={styles.popoverWrap}
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          {panel}
        </div>
      </div>
    );

  return createPortal(overlay, document.body);
}
