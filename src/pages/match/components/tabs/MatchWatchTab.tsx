import type { LiveStreamMatchBundle } from "../../../../types/liveStream";
import styles from "./MatchWatchTab.module.css";

type Props = {
  bundle: LiveStreamMatchBundle & { loading?: boolean };
  homeTeamName: string;
  awayTeamName: string;
  onOpenStream?: (url: string) => void;
};

function isEmbedUrl(url: string): boolean {
  return /embed|iframe|player/i.test(url) || url.includes("#");
}

export function MatchWatchTab({
  bundle,
  homeTeamName,
  awayTeamName,
  onOpenStream,
}: Props) {
  const { loading, scheduleMatch, play, scheduleError, streamMatchId } = bundle;

  if (loading && !play && !scheduleMatch) {
    return (
      <div className={styles.panel}>
        <p className={styles.muted}>Checking live stream availability…</p>
      </div>
    );
  }

  if (scheduleError) {
    return (
      <div className={styles.panel}>
        <p className={styles.emptyTitle}>Schedule temporarily unavailable</p>
        <p className={styles.muted}>
          The stream provider returned: <strong>{scheduleError}</strong>. This is an upstream
          API issue (GraphQL persisted query). Play Stream still works when you have a stream id.
        </p>
      </div>
    );
  }

  if (!scheduleMatch && !play?.available) {
    return (
      <div className={styles.panel}>
        <p className={styles.emptyTitle}>No stream listed for this fixture</p>
        <p className={styles.muted}>
          {homeTeamName} vs {awayTeamName} is not in today&apos;s football stream schedule, or the
          match has not started yet. Streams usually appear closer to kickoff.
        </p>
      </div>
    );
  }

  const embedUrl = play?.embedUrl ?? play?.streamUrl;
  const servers = play?.servers ?? [];

  return (
    <div className={styles.panel}>
      {scheduleMatch ? (
        <div className={styles.meta}>
          <span className={styles.badge}>{scheduleMatch.isLive ? "LIVE" : "Scheduled"}</span>
          {scheduleMatch.league ? <span className={styles.league}>{scheduleMatch.league}</span> : null}
          {streamMatchId ? (
            <span className={styles.id}>Stream id {streamMatchId}</span>
          ) : null}
        </div>
      ) : null}

      {!play?.available ? (
        <div className={styles.unavailable}>
          <p className={styles.emptyTitle}>Stream not available yet</p>
          <p className={styles.muted}>
            {play?.error ?? "The provider has not published a playable link for this match."}
          </p>
        </div>
      ) : (
        <>
          {embedUrl && isEmbedUrl(embedUrl) ? (
            <div className={styles.playerWrap}>
              <iframe
                src={embedUrl}
                title={`Live stream: ${homeTeamName} vs ${awayTeamName}`}
                className={styles.player}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}

          {servers.length > 0 ? (
            <ul className={styles.serverList}>
              {servers.map((server, i) => (
                <li key={`${server.url}-${i}`}>
                  <a
                    href={server.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.serverLink}
                    onClick={(e) => {
                      if (onOpenStream) {
                        e.preventDefault();
                        onOpenStream(server.url);
                      }
                    }}
                  >
                    {server.name ?? `Server ${i + 1}`}
                    {server.type ? ` · ${server.type}` : ""}
                  </a>
                </li>
              ))}
            </ul>
          ) : embedUrl && !isEmbedUrl(embedUrl) ? (
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openBtn}
            >
              Open stream
            </a>
          ) : play.iframeHtml ? (
            <div
              className={styles.embedHtml}
              dangerouslySetInnerHTML={{ __html: play.iframeHtml }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
