import { useMemo } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { listTeamsInBracketProjection } from "../../lib/brackets/collectBracketPathForTeam";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { useStore } from "../../store";
import type { BracketMatch, Team } from "../../types";
import { TeamFlag } from "../team/TeamFlag";

type Props = {
  bracket: BracketMatch[];
  teamsById: Record<string, Team>;
  embedded?: boolean;
};

export function BracketFollowTeamControl({ bracket, teamsById, embedded = false }: Props) {
  const copy = APP_COPY.bracket;
  const followedTeamId = useStore((s) => s.followedTeamId);
  const setFollowedTeamId = useStore((s) => s.setFollowedTeamId);

  const teamIds = useMemo(
    () => listTeamsInBracketProjection(bracket, teamsById),
    [bracket, teamsById]
  );

  if (embedded || teamIds.length === 0) return null;

  const followedTeam = followedTeamId ? teamsById[followedTeamId] : undefined;

  return (
    <div className="bracket-follow-control" aria-label={copy.followTeamLabel}>
      <label className="bracket-follow-control__label" htmlFor="bracket-follow-team-select">
        {copy.followTeamLabel}
      </label>
      <div className="bracket-follow-control__row">
        <select
          id="bracket-follow-team-select"
          className="bracket-follow-control__select"
          value={followedTeamId ?? ""}
          onChange={(event) => setFollowedTeamId(event.target.value || null)}
        >
          <option value="">{copy.followTeamNone}</option>
          {teamIds.map((teamId) => (
            <option key={teamId} value={teamId}>
              {teamDisplayNameFromId(teamId, teamsById)}
            </option>
          ))}
        </select>
        {followedTeamId && followedTeam ? (
          <div className="bracket-follow-control__chip">
            <TeamFlag team={followedTeam} teamId={followedTeamId} size="sm" compact />
            <span>{copy.followTeamActive(teamDisplayNameFromId(followedTeamId, teamsById))}</span>
            <button
              type="button"
              className="bracket-follow-control__clear"
              onClick={() => setFollowedTeamId(null)}
              aria-label={copy.clearFollowTeamLabel}
            >
              ×
            </button>
          </div>
        ) : (
          <p className="bracket-follow-control__hint">{copy.followTeamHint}</p>
        )}
      </div>
    </div>
  );
}
