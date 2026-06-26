import { useEffect, useId, useRef } from "react";
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

type VenuePopoverProps = {
  venue: ResolvedVenue;
  open: boolean;
  mode: "popover" | "sheet";
  onClose: () => void;
  onOpenHub: () => void;
};

export function VenuePopover({ venue, open, mode, onClose, onOpenHub }: VenuePopoverProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

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
    >
      <VenuePopoverPanel venue={venue} onClose={onClose} onOpenHub={onOpenHub} titleId={titleId} />
    </div>
  );

  if (mode === "sheet") {
    return (
      <div
        className={styles.sheetBackdrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {panel}
      </div>
    );
  }

  return <div className={styles.popoverWrap}>{panel}</div>;
}
