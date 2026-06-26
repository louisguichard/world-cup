/** Parse .env files and detect placeholder values. */

const PLACEHOLDER_VALUES = new Set([
  "FILL_ME_IN",
  "",
  "your_key_here",
  "your-key-here",
  "your_rapidapi_key_here",
]);

export function isPlaceholderValue(value: string): boolean {
  const v = value.trim();
  return PLACEHOLDER_VALUES.has(v) || v.startsWith("your_");
}

export function parseEnvFile(content: string): Array<{ name: string; value: string }> {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const eq = line.indexOf("=");
      if (eq === -1) return [];
      const name = line.slice(0, eq).trim();
      const raw = line.slice(eq + 1).trim();
      const value = raw.replace(/^["']|["']$/g, "");
      return [{ name, value }];
    });
}
