import { isBootDebugEnabled, isMobileBootProfile } from "./bootProfile";

export type BootPhaseId =
  | "boot-start"
  | "espn-fetch"
  | "teams-merge"
  | "matches-build"
  | "standings-load"
  | "simulation"
  | "splash-hold"
  | "services-start"
  | "deferred-enrichment"
  | "boot-complete";

export type BootPhaseMark = {
  id: BootPhaseId;
  label: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  detail?: string;
};

export type BootMetricsSnapshot = {
  mobileFastPath: boolean;
  startedAt: number;
  finishedAt: number | null;
  totalMs: number | null;
  phases: BootPhaseMark[];
  navigation?: {
    domContentLoaded?: number;
    loadEvent?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
};

declare global {
  interface Window {
    __WC_BOOT_METRICS__?: BootMetricsSnapshot;
  }
}

let bootStart = 0;
let mobileFastPath = false;
let finishedAt: number | null = null;
const phases: BootPhaseMark[] = [];
const openPhases = new Map<BootPhaseId, { startedAt: number; label: string; detail?: string }>();

const PHASE_LABELS: Record<BootPhaseId, string> = {
  "boot-start": "Bootstrap",
  "espn-fetch": "ESPN scoreboard",
  "teams-merge": "Team metadata",
  "matches-build": "Schedule / live matches",
  "standings-load": "Group standings",
  simulation: "Monte Carlo sim",
  "splash-hold": "Splash minimum hold",
  "services-start": "Background services",
  "deferred-enrichment": "Deferred enrichment (mobile)",
  "boot-complete": "Boot complete",
};

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function readNavigationTiming(): BootMetricsSnapshot["navigation"] {
  if (typeof performance === "undefined") return undefined;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const paint = performance.getEntriesByType("paint");
  const fcp = paint.find((e) => e.name === "first-contentful-paint");
  const fp = paint.find((e) => e.name === "first-paint");
  return {
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : undefined,
    loadEvent: nav ? Math.round(nav.loadEventEnd) : undefined,
    firstPaint: fp ? Math.round(fp.startTime) : undefined,
    firstContentfulPaint: fcp ? Math.round(fcp.startTime) : undefined,
  };
}

function publish(): void {
  const snapshot: BootMetricsSnapshot = {
    mobileFastPath,
    startedAt: bootStart,
    finishedAt,
    totalMs: finishedAt != null ? Math.round(finishedAt - bootStart) : null,
    phases: [...phases],
    navigation: readNavigationTiming(),
  };
  if (typeof window !== "undefined") {
    window.__WC_BOOT_METRICS__ = snapshot;
  }
}

export function startBootTracking(): void {
  bootStart = now();
  mobileFastPath = isMobileBootProfile();
  finishedAt = null;
  phases.length = 0;
  openPhases.clear();
  const t = bootStart;
  phases.push({
    id: "boot-start",
    label: PHASE_LABELS["boot-start"],
    startedAt: t,
    endedAt: t,
    durationMs: 0,
    detail: mobileFastPath ? "mobile fast path" : "full path",
  });
  publish();
}

export function startBootPhase(id: BootPhaseId, detail?: string): void {
  if (bootStart === 0) startBootTracking();
  openPhases.set(id, { startedAt: now(), label: PHASE_LABELS[id], detail });
  publish();
}

export function endBootPhase(id: BootPhaseId, detail?: string): void {
  const open = openPhases.get(id);
  if (!open) return;
  const t = now();
  phases.push({
    id,
    label: PHASE_LABELS[id],
    startedAt: open.startedAt,
    endedAt: t,
    durationMs: Math.round(t - open.startedAt),
    detail: detail ?? open.detail,
  });
  openPhases.delete(id);
  publish();
}

/** @deprecated Use startBootPhase/endBootPhase pairs. */
export function markBootPhase(id: BootPhaseId, detail?: string): void {
  if (openPhases.has(id)) {
    endBootPhase(id, detail);
  } else {
    startBootPhase(id, detail);
  }
}

export function finishBootTracking(detail?: string): void {
  endBootPhase("boot-complete", detail);
  finishedAt = now();
  publish();
  if (isBootDebugEnabled()) {
    console.info("[WC boot]", formatBootReport());
  }
}

export function getBootMetrics(): BootMetricsSnapshot {
  publish();
  return {
    mobileFastPath,
    startedAt: bootStart,
    finishedAt,
    totalMs: finishedAt != null ? Math.round(finishedAt - bootStart) : null,
    phases: [...phases],
    navigation: readNavigationTiming(),
  };
}

export function formatBootReport(snapshot = getBootMetrics()): string {
  const lines = [
    `Boot ${snapshot.totalMs != null ? `${snapshot.totalMs}ms` : "in progress"} (${snapshot.mobileFastPath ? "mobile fast" : "full"})`,
  ];
  for (const phase of snapshot.phases) {
    lines.push(`  ${phase.label}: ${phase.durationMs}ms${phase.detail ? ` — ${phase.detail}` : ""}`);
  }
  const nav = snapshot.navigation;
  if (nav?.firstContentfulPaint != null) {
    lines.push(`  FCP: ${nav.firstContentfulPaint}ms`);
  }
  return lines.join("\n");
}
