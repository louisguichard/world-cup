import { useMemo, useState } from "react";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { resolveVenueBySlug } from "../../lib/venue/resolveVenue";
import { buildVenueMatchSlice } from "../../lib/venue/venueMatches";
import { clearReturnContext } from "../../store/slices/navigationSlice";
import { useStore } from "../../store";
import { VenueMatchRow } from "../../components/venue/VenueMatchRow";
import { VenuePopoverPanel } from "../../components/venue/VenuePopover";
import { VenueTimelinePreview } from "../../components/venue/VenueTimelinePreview";
import styles from "./VenueHubView.module.css";

type ExpandMode = "preview" | "future" | "past";

export function VenueHubView() {
  const activeVenueSlug = useStore((s) => s.activeVenueSlug);
  const returnContext = useStore((s) => s.returnContext);
  const closeVenueHub = useStore((s) => s.closeVenueHub);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  const [expandMode, setExpandMode] = useState<ExpandMode>("preview");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const venue = useMemo(
    () => (activeVenueSlug ? resolveVenueBySlug(activeVenueSlug) : null),
    [activeVenueSlug]
  );

  const allMatches = useMemo(
    () => materializeFullSchedule(teams, liveMatches),
    [teams, liveMatches]
  );

  const slice = useMemo(() => {
    if (!venue) return null;
    return buildVenueMatchSlice(allMatches, venue.stadiumName);
  }, [allMatches, venue]);

  const handleBack = () => {
    const ctx = returnContext;
    closeVenueHub();
    clearReturnContext();
    if (ctx && ctx.from !== "venue") {
      setActiveTab(ctx.from as import("../../types").TabId);
    }
  };

  const handleSelectMatch = (matchId: string) => {
    openMatchDetail(matchId, {
      from: "venue",
      venueSlug: activeVenueSlug ?? undefined,
      scrollY: window.scrollY
    });
  };

  if (!activeVenueSlug || !venue || !slice) return null;

  const titleId = `venue-hub-${venue.slug}`;

  return (
    <div className={styles.overlay} role="dialog" aria-labelledby={titleId}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={handleBack}>
          ← Back
        </button>
        <div className={styles.titleBlock}>
          <h1 id={titleId} className={styles.titlePrimary}>
            {venue.displayPrimary}
          </h1>
          <p className={styles.titleSecondary}>
            {venue.hostCity} · {venue.country}
          </p>
        </div>
      </header>

      <div className={styles.scroll}>
        <div className={styles.hubInner}>
          <div className={styles.detailsToggle}>
            <button
              type="button"
              className={styles.detailsBtn}
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
            >
              {detailsOpen ? "Hide venue details" : "Venue details"}
            </button>
            {detailsOpen ? (
              <div className={styles.detailsPanel}>
                <VenuePopoverPanel
                  venue={venue}
                  onClose={() => setDetailsOpen(false)}
                  onOpenHub={() => setDetailsOpen(false)}
                  titleId={`${titleId}-details`}
                  showHubCta={false}
                />
              </div>
            ) : null}
          </div>

          {expandMode === "preview" ? (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Most recent</h2>
                {slice.recent ? (
                  <VenueMatchRow
                    match={slice.recent}
                    home={teams[slice.recent.homeTeamId]}
                    away={teams[slice.recent.awayTeamId]}
                    onSelect={() => handleSelectMatch(slice.recent!.matchId ?? slice.recent!.id)}
                  />
                ) : (
                  <p className={styles.emptyNote}>No completed matches at this venue yet.</p>
                )}
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Next up</h2>
                {slice.upcoming ? (
                  <VenueMatchRow
                    match={slice.upcoming}
                    home={teams[slice.upcoming.homeTeamId]}
                    away={teams[slice.upcoming.awayTeamId]}
                    onSelect={() => handleSelectMatch(slice.upcoming!.matchId ?? slice.upcoming!.id)}
                  />
                ) : (
                  <p className={styles.emptyNote}>No upcoming matches scheduled.</p>
                )}
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Timeline preview</h2>
                <VenueTimelinePreview
                  matches={slice.timeline}
                  teamsById={teams}
                  onSelectMatch={handleSelectMatch}
                />
              </section>
            </>
          ) : null}

          {expandMode === "future" ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>All future games</h2>
              {slice.future.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {slice.future.map((m) => (
                    <VenueMatchRow
                      key={m.matchId ?? m.id}
                      match={m}
                      home={teams[m.homeTeamId]}
                      away={teams[m.awayTeamId]}
                      onSelect={() => handleSelectMatch(m.matchId ?? m.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.emptyNote}>No future matches.</p>
              )}
            </section>
          ) : null}

          {expandMode === "past" ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>All past games</h2>
              {slice.past.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {slice.past.map((m) => (
                    <VenueMatchRow
                      key={m.matchId ?? m.id}
                      match={m}
                      home={teams[m.homeTeamId]}
                      away={teams[m.awayTeamId]}
                      onSelect={() => handleSelectMatch(m.matchId ?? m.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.emptyNote}>No past matches.</p>
              )}
            </section>
          ) : null}

          <div className={styles.expandRow}>
            <button
              type="button"
              className={`${styles.expandBtn} ${expandMode === "preview" ? styles.expandBtnActive : ""}`}
              onClick={() => setExpandMode("preview")}
            >
              Compact preview
            </button>
            <button
              type="button"
              className={`${styles.expandBtn} ${expandMode === "future" ? styles.expandBtnActive : ""}`}
              onClick={() => setExpandMode("future")}
            >
              Show all future games
            </button>
            <button
              type="button"
              className={`${styles.expandBtn} ${expandMode === "past" ? styles.expandBtnActive : ""}`}
              onClick={() => setExpandMode("past")}
            >
              Show all past games
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
