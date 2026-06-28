/**
 * Per-provider Zod schemas — wire-boundary validation.
 * Every provider response must pass its schema before reaching canonical state.
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// ESPN schemas
// ─────────────────────────────────────────────

export const EspnTeamSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  abbreviation: z.string().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  alternateColor: z.string().optional(),
  logos: z.array(z.object({ href: z.string() })).optional(),
});

export const EspnCompetitorSchema = z.object({
  id: z.string(),
  homeAway: z.enum(["home", "away"]),
  team: EspnTeamSchema,
  score: z.string().optional(),
});

export const EspnStatusSchema = z.object({
  type: z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    completed: z.boolean().optional(),
  }),
  displayClock: z.string().optional(),
  period: z.number().optional(),
});

export const EspnMatchSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string().optional(),
  shortName: z.string().optional(),
  status: EspnStatusSchema,
  competitors: z.array(EspnCompetitorSchema).min(2).max(2),
  venue: z
    .object({
      id: z.string().optional(),
      fullName: z.string().optional(),
      address: z.object({ city: z.string().optional() }).optional(),
    })
    .optional(),
});

export const EspnEventsResponseSchema = z.object({
  events: z.array(EspnMatchSchema),
});

// ─────────────────────────────────────────────
// WC Live schemas
// ─────────────────────────────────────────────

export const WcLiveMatchSchema = z.object({
  id: z.union([z.string(), z.number()]),
  homeTeam: z.object({ id: z.union([z.string(), z.number()]), name: z.string() }),
  awayTeam: z.object({ id: z.union([z.string(), z.number()]), name: z.string() }),
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),
  status: z.string(),
  minute: z.number().nullable().optional(),
  kickoff: z.string().optional(),
});

export const WcLiveResponseSchema = z.object({
  matches: z.array(WcLiveMatchSchema),
});

// ─────────────────────────────────────────────
// Zafronix schemas
// ─────────────────────────────────────────────

export const ZafronixTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string().optional(),
  country: z.string().optional(),
});

export const ZafronixMatchSchema = z.object({
  id: z.number(),
  homeTeam: ZafronixTeamSchema,
  awayTeam: ZafronixTeamSchema,
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),
  status: z.string(),
  startTime: z.string(),
  venue: z.object({ id: z.number(), name: z.string() }).optional(),
});

export const ZafronixMatchesResponseSchema = z.object({
  data: z.array(ZafronixMatchSchema),
});

// ─────────────────────────────────────────────
// ClubElo schema
// ─────────────────────────────────────────────

export const ClubEloTeamSchema = z.object({
  Club: z.string(),
  Country: z.string(),
  Level: z.number(),
  Elo: z.number(),
  From: z.string(),
  To: z.string(),
});

export const ClubEloResponseSchema = z.array(ClubEloTeamSchema);

// ─────────────────────────────────────────────
// SofaScore schemas
// ─────────────────────────────────────────────

export const SofaScoreTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  nameCode: z.string().optional(),
  shortName: z.string().optional(),
});

export const SofaScoreEventSchema = z.object({
  id: z.number(),
  homeTeam: SofaScoreTeamSchema,
  awayTeam: SofaScoreTeamSchema,
  homeScore: z.object({ current: z.number().optional() }).optional(),
  awayScore: z.object({ current: z.number().optional() }).optional(),
  status: z.object({ code: z.number(), description: z.string() }),
  startTimestamp: z.number(),
  tournament: z.object({ id: z.number(), name: z.string() }).optional(),
});

// ─────────────────────────────────────────────
// Provider schema registry
// ─────────────────────────────────────────────

export type ProviderSchema<T = unknown> = {
  matches: (payload: unknown) => T;
  safeParse: (payload: unknown) => { success: boolean; data?: T; error?: string };
};

export function makeSchema<T>(schema: z.ZodType<T>): ProviderSchema<T> {
  return {
    matches: (p) => schema.parse(p),
    safeParse: (p) => {
      const result = schema.safeParse(p);
      if (result.success) return { success: true, data: result.data };
      return {
        success: false,
        error: result.error.issues.map((i) => i.message).join("; "),
      };
    },
  };
}

export const PROVIDER_SCHEMAS = {
  espn: makeSchema(EspnEventsResponseSchema),
  "wc-live": makeSchema(WcLiveResponseSchema),
  zafronix: makeSchema(ZafronixMatchesResponseSchema),
  clubelo: makeSchema(ClubEloResponseSchema),
  sofascore: makeSchema(z.object({ events: z.array(SofaScoreEventSchema) })),
} as const;

export type ProviderId = keyof typeof PROVIDER_SCHEMAS;
