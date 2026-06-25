import type { LogEntry } from "../services/Logger";
import type { QualificationTier } from "../types";

declare global {
  interface Window {
    __appLogs: LogEntry[];
    __lastError: LogEntry | undefined;
    __lastBentoCrash:
      | {
          bento: string;
          error: string;
          stack: string | undefined;
        }
      | undefined;
    __lastQualificationChange:
      | {
          teamId: string;
          from: QualificationTier;
          to: QualificationTier;
          at: number;
        }
      | undefined;
    __pollingStatus:
      | {
          running: boolean;
          liveMatchCount: number;
          intervalMs: number;
          lastPollAt: number | null;
          consecutiveErrors: number;
        }
      | undefined;
  }
}

export {};
