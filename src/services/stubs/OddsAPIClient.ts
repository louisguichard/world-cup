export async function getMatchOdds(): Promise<null> {
  if (!import.meta.env.VITE_ODDS_API_KEY) return null;
  return null;
}
