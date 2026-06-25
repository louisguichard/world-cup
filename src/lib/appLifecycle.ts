import { PollingEngine } from "../services/PollingEngine";
import { logger } from "../services/Logger";

/** Start background services after a successful bootstrap (idempotent). */
export function startAppServices(): void {
  PollingEngine.getInstance().start();
  logger.info("App services started", "AppLifecycle");
}
