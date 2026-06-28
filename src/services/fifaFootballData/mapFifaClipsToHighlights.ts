import type { HighlightlyHighlight } from "../../types/sportHighlights";
import type { FifaMatchVideoClip } from "../../types/fifaFootballData";

/** Map FIFA match video clips into Highlightly-shaped cards for the highlights tab. */
export function mapFifaClipsToHighlights(clips: FifaMatchVideoClip[]): HighlightlyHighlight[] {
  return clips.map((clip, index) => ({
    id: clip.id != null ? Number(clip.id) || index + 1_000_000 : index + 1_000_000,
    title: clip.title ?? "FIFA match video",
    description: undefined,
    url: clip.url,
    embedUrl: clip.embedUrl,
    imgUrl: clip.thumbnailUrl,
    type: clip.type ?? "video",
    source: clip.source ?? "FIFA",
  }));
}
