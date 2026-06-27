import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const ROOT_DIR = ROOT;
export const VERSION_FILE = join(ROOT, "version.json");
export const PACKAGE_FILE = join(ROOT, "package.json");
export const VERSION_LOG = join(ROOT, "VERSION_LOG.md");
export const CHANGELOG = join(ROOT, "CHANGELOG.md");
export const BUILD_MANIFEST = join(ROOT, "build-manifest.json");

/** Files touched by the version system — staging only these does not trigger another bump. */
export const VERSION_ARTIFACT_PATHS = new Set([
  "version.json",
  "package.json",
  "package-lock.json",
  "VERSION_LOG.md",
  "CHANGELOG.md",
  "build-manifest.json",
  "docs/VERSIONING.md",
]);

export const RELEASE_CANVAS_PATH = join(
  process.env.HOME ?? "",
  ".cursor/projects/Users-RonalSorto-Developer-world-cup/canvases/release-dashboard.canvas.tsx"
);

export const RELEASE_CANVAS_SNAPSHOT_START = "// <<RELEASE_SNAPSHOT_START>>";
export const RELEASE_CANVAS_SNAPSHOT_END = "// <<RELEASE_SNAPSHOT_END>>";
