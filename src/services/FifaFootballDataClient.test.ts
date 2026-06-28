import { describe, expect, it } from "vitest";
import {
  FIFA_WC2026_STAGE_ID,
  fifaFootballDataEndpoints,
  isFifaFootballDataPathAllowed,
} from "../config/fifaFootballDataEndpoints";
import {
  normalizeFifaFootballMatch,
  normalizeFifaFootballPlayer,
  normalizeFifaMatchVideoClip,
  normalizeFifaMatchVideoClips,
} from "./FifaFootballDataClient";
import { mapFifaClipsToHighlights } from "./fifaFootballData/mapFifaClipsToHighlights";

describe("fifaFootballDataEndpoints", () => {
  it("builds match video route with stage and id", () => {
    expect(fifaFootballDataEndpoints.singleMatchVideo(285063, 400128082)).toBe(
      "/fifa-single-match-video/v1/data?stage=285063&id=400128082"
    );
    expect(fifaFootballDataEndpoints.teamMatchList(43922)).toBe(
      "/fifa-team-matchlist/v1/data?id=43922"
    );
    expect(FIFA_WC2026_STAGE_ID).toBe(285063);
  });

  it("allowlists fifa proxy paths", () => {
    expect(isFifaFootballDataPathAllowed("/fifa-single-match/v1/data")).toBe(true);
    expect(isFifaFootballDataPathAllowed("/other")).toBe(false);
  });
});

describe("FifaFootballDataClient normalize", () => {
  it("normalizes player detail", () => {
    const player = normalizeFifaFootballPlayer({
      id: 43922,
      name: "Lionel Messi",
      nationality: "Argentina",
      position: "F",
      image: "https://example.com/messi.jpg",
    });
    expect(player?.name).toBe("Lionel Messi");
    expect(player?.photoUrl).toContain("messi.jpg");
  });

  it("normalizes match detail", () => {
    const match = normalizeFifaFootballMatch({
      id: 400128082,
      stage: 285063,
      homeTeam: "Brazil",
      awayTeam: "France",
      homeScore: 2,
      awayScore: 1,
    });
    expect(match?.homeTeam).toBe("Brazil");
    expect(match?.stageId).toBe(285063);
  });

  it("normalizes single and list video clips", () => {
    const single = normalizeFifaMatchVideoClip({
      title: "Full match highlights",
      url: "https://example.com/video.mp4",
      thumbnail: "https://example.com/thumb.jpg",
    });
    expect(single?.url).toContain("video.mp4");

    const list = normalizeFifaMatchVideoClips({
      videos: [
        { title: "Goal 1", url: "https://example.com/g1.mp4" },
        { title: "Goal 2", url: "https://example.com/g2.mp4" },
      ],
    });
    expect(list).toHaveLength(2);
  });

  it("maps clips to highlight cards", () => {
    const cards = mapFifaClipsToHighlights([
      { title: "Recap", url: "https://example.com/recap", source: "FIFA" },
    ]);
    expect(cards[0]?.title).toBe("Recap");
    expect(cards[0]?.source).toBe("FIFA");
  });
});
