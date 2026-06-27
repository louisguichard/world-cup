import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

/** Known apps — env files are read locally; values never go in git. */
export type KnownProject = {
  name: string;
  envFilePath: string;
  /** Project root to scan for env usage (defaults to parent of env file) */
  rootPath?: string;
  /** envVarNames we expect for this app (import order / UI hints) */
  expectedVars?: string[];
};

export const KNOWN_PROJECTS: KnownProject[] = [
  {
    name: "World Cup Tracker",
    envFilePath: join(HOME, "Developer/world-cup/.env.local"),
    rootPath: join(HOME, "Developer/world-cup"),
    expectedVars: ["VITE_RAPIDAPI_KEY", "RAPIDAPI_KEY"],
  },
  {
    name: "Textbook Manager",
    envFilePath: join(HOME, "Developer/textbook-manager/.env.local"),
    rootPath: join(HOME, "Developer/textbook-manager"),
    expectedVars: [
      "VITE_SENTRY_DSN",
      "SENTRY_DSN",
      "SENTRY_AUTH_TOKEN",
      "SENTRY_ORG",
      "SENTRY_PROJECT",
    ],
  },
  {
    name: "Memo",
    envFilePath: join(HOME, "Developer/memo/.env.local"),
    rootPath: join(HOME, "Developer/memo"),
    expectedVars: ["GEMINI_API_KEY", "SENTRY_DSN"],
  },
];
