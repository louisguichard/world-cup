import { z } from "zod";

export const FifaPublicMatchSchema = z.object({
  matchNumber: z.number().nullable().optional(),
  stage: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  dateUtc: z.string().nullable().optional(),
  home: z.string().nullable().optional(),
  away: z.string().nullable().optional(),
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),
  winner: z.string().nullable().optional(),
  status: z.string().optional(),
  placeholderA: z.string().nullable().optional(),
  placeholderB: z.string().nullable().optional(),
  idMatch: z.string().optional(),
  idStage: z.string().optional(),
});

export const FifaPublicMatchesResponseSchema = z.object({
  matches: z.array(FifaPublicMatchSchema),
});

export const FifaPublicTeamSchema = z.object({
  idTeam: z.string(),
  name: z.string().nullable().optional(),
  abbreviation: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  stadium: z.string().nullable().optional(),
  idStadium: z.string().nullable().optional(),
  pictureUrl: z.string().nullable().optional(),
});

export const FifaPublicTeamsResponseSchema = z.object({
  teams: z.array(FifaPublicTeamSchema),
});

export const FifaPublicStadiumSchema = z.object({
  idStadium: z.string(),
  name: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  capacity: z.number().nullable().optional(),
});

export const FifaPublicStadiumsResponseSchema = z.object({
  stadiums: z.array(FifaPublicStadiumSchema),
});

export const FifaPublicLiveDetailSchema = z.object({
  idMatch: z.string().optional(),
  status: z.string().optional(),
  dateUtc: z.string().nullable().optional(),
  score: z
    .object({
      home: z.number().nullable().optional(),
      away: z.number().nullable().optional(),
    })
    .optional(),
});

export const FifaPublicLiveMatchSchema = FifaPublicMatchSchema.extend({
  live: FifaPublicLiveDetailSchema.nullable().optional(),
});

export const FifaPublicLiveResponseSchema = z.object({
  matches: z.array(FifaPublicLiveMatchSchema),
});

export type FifaPublicMatch = z.infer<typeof FifaPublicMatchSchema>;
export type FifaPublicTeam = z.infer<typeof FifaPublicTeamSchema>;
export type FifaPublicStadium = z.infer<typeof FifaPublicStadiumSchema>;
export type FifaPublicLiveMatch = z.infer<typeof FifaPublicLiveMatchSchema>;
