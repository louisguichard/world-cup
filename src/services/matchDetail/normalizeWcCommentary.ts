import type { WcCommentaryEntry } from "../WorldCup2026LiveClient";

export type WcCommentaryIncident = {
  period?: string;
  minute?: string | number;
  type?: string;
  side?: "home" | "away" | null;
  player?: string;
  text?: string | null;
};

function incidentLabel(type: string | undefined): string {
  if (!type) return "Event";
  return type.replace(/_/g, " ");
}

function buildIncidentText(inc: WcCommentaryIncident): string {
  if (inc.text && inc.text.trim()) return inc.text.trim();
  const label = incidentLabel(inc.type);
  if (inc.player) return `${label}: ${inc.player}`;
  return label;
}

export function normalizeWcCommentaryResponse(raw: unknown): WcCommentaryEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== "object") return [];

  const incidents = (data as Record<string, unknown>).incidents;
  if (!Array.isArray(incidents)) return [];

  return incidents
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((inc) => {
      const typed = inc as WcCommentaryIncident;
      return {
        minute: typed.minute,
        text: buildIncidentText(typed),
        type: typed.type,
        period: typed.period,
        side: typed.side ?? undefined,
        player: typed.player,
      } satisfies WcCommentaryEntry;
    });
}
