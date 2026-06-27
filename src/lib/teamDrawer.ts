/** Tab ids for the universal team drawer (TeamDetailSheet). */
export type TeamDrawerTab =
  | "overview"
  | "matches"
  | "players"
  | "form"
  | "context"
  | "historical";

export type OpenTeamSheetOptions = {
  tab?: TeamDrawerTab;
};

export const TEAM_DRAWER_TABS: TeamDrawerTab[] = [
  "overview",
  "matches",
  "players",
  "form",
  "context",
  "historical",
];
