import type { AppStore } from "../index";
import { resolveTeamIdentity, resolveTeamIdentityById } from "../../lib/teamIdentity";
import type { Team } from "../../types";

export function getTeamIdentity(teamId: string, teams: Record<string, Team>) {
  return resolveTeamIdentityById(teamId, teams);
}

export function getTeamIdentityFromState(teamId: string, state: Pick<AppStore, "teams">) {
  return getTeamIdentity(teamId, state.teams);
}

export { resolveTeamIdentity };
