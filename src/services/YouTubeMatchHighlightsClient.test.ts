import { describe, expect, it } from "vitest";
import type { MergedMatch, Team } from "../types";
import {
  normalizeGoogleVideoCandidate,
  normalizeWebsiteContacts,
  normalizeYouTube138Candidate,
  youtubeScreenshotUrl,
} from "./YouTubeMatchHighlightsClient";
import { verifyYouTubeMatchVideo } from "./youtubeHighlights/verifyYouTubeMatchVideo";

const match: MergedMatch = {
  id: "m1",
  matchId: "101",
  date: "2026-06-20T20:00:00Z",
  homeTeamId: "bra",
  awayTeamId: "fra",
  status: "completed",
  homeScore: 2,
  awayScore: 1,
  homeConduct: 0,
  awayConduct: 0,
  locked: true,
  source: "manual",
};

const homeTeam: Team = {
  id: "bra",
  name: "Brazil",
  shortName: "Brazil",
  abbreviation: "BRA",
  group: "A",
  rating: 90,
};

const awayTeam: Team = {
  id: "fra",
  name: "France",
  shortName: "France",
  abbreviation: "FRA",
  group: "A",
  rating: 90,
};

describe("YouTubeMatchHighlightsClient normalize", () => {
  it("normalizes youtube138 channel video shapes", () => {
    const candidate = normalizeYouTube138Candidate({
      video: {
        videoId: "PuQFESk0BrA",
        title: "Brazil vs France highlights | FIFA World Cup | FOX Soccer",
        channelTitle: "FOX Soccer",
        thumbnails: [{ url: "https://example.com/thumb.jpg" }],
      },
    });
    expect(candidate?.videoId).toBe("PuQFESk0BrA");
    expect(candidate?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });

  it("normalizes Google video results with YouTube URLs", () => {
    const candidate = normalizeGoogleVideoCandidate({
      title: "Brazil vs France preview | Telemundo Deportes",
      link: "https://www.youtube.com/watch?v=PuQFESk0BrA",
      source: "Telemundo Deportes",
    });
    expect(candidate?.videoId).toBe("PuQFESk0BrA");
    expect(candidate?.channelTitle).toBe("Telemundo Deportes");
  });

  it("normalizes website social contacts", () => {
    expect(
      normalizeWebsiteContacts({
        contacts: [{ type: "youtube", url: "https://www.youtube.com/@foxsoccer" }],
      })[0]?.url
    ).toContain("youtube.com");
  });

  it("builds screenshot proxy URL in browser mode", () => {
    expect(youtubeScreenshotUrl("PuQFESk0BrA")).toContain("video_id=PuQFESk0BrA");
  });
});

describe("verifyYouTubeMatchVideo", () => {
  it("accepts official videos that match both teams and kind", () => {
    const verified = verifyYouTubeMatchVideo(
      {
        videoId: "PuQFESk0BrA",
        title: "Brazil vs France extended highlights | FIFA World Cup | FOX Soccer",
        channelId: "UCooTLkxcpnTNx6vfOovfBFA",
        channelTitle: "FOX Soccer",
        source: "youtube138",
      },
      { match, homeTeam, awayTeam, homeTeamName: "Brazil", awayTeamName: "France" }
    );
    expect(verified?.kind).toBe("highlights");
    expect(verified?.verified).toBe(true);
  });

  it("rejects unrelated videos from an official channel", () => {
    const verified = verifyYouTubeMatchVideo(
      {
        videoId: "PuQFESk0BrA",
        title: "Spain vs Germany highlights | FIFA World Cup | FOX Soccer",
        channelId: "UCooTLkxcpnTNx6vfOovfBFA",
        channelTitle: "FOX Soccer",
        source: "youtube138",
      },
      { match, homeTeam, awayTeam, homeTeamName: "Brazil", awayTeamName: "France" }
    );
    expect(verified).toBeNull();
  });
});

