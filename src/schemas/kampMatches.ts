import { z } from "zod";

export const KampGoalSchema = z.object({
  team: z.string(),
  player: z.string(),
  minute: z.number(),
  contra: z.boolean().optional(),
});

export const KampMatchSchema = z.object({
  time: z.string(),
  team_1: z.string(),
  team_2: z.string(),
  location: z.string().optional(),
  score_1: z.number().optional(),
  score_2: z.number().optional(),
  gols: z.array(KampGoalSchema).optional(),
  highlights_url: z.string().url().optional(),
  bracketSlot: z.number().optional(),
});

export const KampDayBucketSchema = z.object({
  date: z.string(),
  fase: z.string(),
  matches: z.array(KampMatchSchema),
});

export const KampMatchesResponseSchema = z.array(KampDayBucketSchema);

export type KampGoal = z.infer<typeof KampGoalSchema>;
export type KampMatch = z.infer<typeof KampMatchSchema>;
export type KampDayBucket = z.infer<typeof KampDayBucketSchema>;

export type KampMatchRecord = KampMatch & {
  date: string;
  fase: string;
};
