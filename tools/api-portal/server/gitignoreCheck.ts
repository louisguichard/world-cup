import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, basename, join } from "node:path";

/**
 * Returns true if the given filename (e.g. ".env.local") would be covered
 * by any pattern in the project's .gitignore.
 * Supports: exact match, glob prefixes like *.local, .env.*, /, trailing slash.
 */
function isIgnoredByPattern(filename: string, patterns: string[]): boolean {
  for (const raw of patterns) {
    const pattern = raw.trim();
    if (!pattern || pattern.startsWith("#")) continue;

    // Strip leading slash (makes pattern rooted — still matches filename)
    const p = pattern.startsWith("/") ? pattern.slice(1) : pattern;

    if (p === filename) return true;
    if (p === `${filename}/`) return true; // trailing slash variant

    // Simple glob: convert *.ext or .prefix.* to regex
    if (p.includes("*")) {
      const escaped = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      if (new RegExp(`^${escaped}$`).test(filename)) return true;
    }
  }
  return false;
}

/**
 * Throws a descriptive error if the target env file is not covered by the
 * project's .gitignore. Resolves the project root as dirname(envFilePath).
 */
export async function assertEnvFileIsGitignored(envFilePath: string): Promise<void> {
  const projectRoot = dirname(envFilePath);
  const gitignorePath = join(projectRoot, ".gitignore");
  const filename = basename(envFilePath);

  if (!existsSync(gitignorePath)) {
    throw new Error(
      `Safety check failed: no .gitignore found at ${gitignorePath}. Sync aborted.`
    );
  }

  const contents = await readFile(gitignorePath, "utf8");
  const patterns = contents.split("\n");

  if (!isIgnoredByPattern(filename, patterns)) {
    throw new Error(
      `Safety check failed: ${filename} is not in .gitignore for this project. Sync aborted.`
    );
  }
}
