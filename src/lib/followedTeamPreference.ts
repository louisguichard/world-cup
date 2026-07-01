export const FOLLOWED_TEAM_STORAGE_KEY = "wc-followed-team";

export function readStoredFollowedTeamId(): string | null {
  try {
    const value = localStorage.getItem(FOLLOWED_TEAM_STORAGE_KEY);
    if (!value) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeStoredFollowedTeamId(teamId: string | null): void {
  try {
    if (!teamId) {
      localStorage.removeItem(FOLLOWED_TEAM_STORAGE_KEY);
      return;
    }
    localStorage.setItem(FOLLOWED_TEAM_STORAGE_KEY, teamId);
  } catch {
    /* ignore */
  }
}
