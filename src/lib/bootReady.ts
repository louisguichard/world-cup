const BOOT_POLL_RETRY_MS = 500;
const DEFAULT_BOOT_READY_TIMEOUT_MS = 3_000;

let bootReady = false;
let bootReadyResolvers: Array<() => void> = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reset before a new bootstrap (tests + full reload). */
export function resetBootReady(): void {
  bootReady = false;
  bootReadyResolvers = [];
}

/** True once bootstrap penalty enrichment finished (or timed out) and polling may run. */
export function isBootReady(): boolean {
  return bootReady;
}

export function markBootReady(): void {
  if (bootReady) return;
  bootReady = true;
  for (const resolve of bootReadyResolvers) {
    resolve();
  }
  bootReadyResolvers = [];
}

export function waitForBootReady(timeoutMs = DEFAULT_BOOT_READY_TIMEOUT_MS): Promise<boolean> {
  if (bootReady) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    bootReadyResolvers.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/** Delay before retrying poll when boot is not ready yet. */
export function bootPollRetryMs(): number {
  return BOOT_POLL_RETRY_MS;
}

export async function awaitBootPenaltyEnrichment<T>(
  task: () => Promise<T>,
  fallback: T,
  timeoutMs = DEFAULT_BOOT_READY_TIMEOUT_MS
): Promise<T> {
  try {
    return await Promise.race([task(), sleep(timeoutMs).then(() => fallback)]);
  } catch {
    return fallback;
  }
}
