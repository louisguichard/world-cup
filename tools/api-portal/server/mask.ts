import type { ApiKey } from "./vault.js";
import { isPlaceholderValue } from "./envParse.js";

export type KeyStatus = "active" | "inactive" | "untested" | "placeholder" | "disabled";

function computeStatus(key: ApiKey): KeyStatus {
  if (key.disabled) return "disabled";
  if (isPlaceholderValue(key.value)) return "placeholder";
  if (!key.lastTestedAt) return "untested";

  const ageMs = Date.now() - new Date(key.lastTestedAt).getTime();
  const stale = ageMs > 24 * 60 * 60 * 1000; // older than 24h → untested

  if (!key.lastTestStatus) return "untested";
  if (key.lastTestStatus >= 200 && key.lastTestStatus < 300) {
    return stale ? "untested" : "active";
  }
  return "inactive";
}

export type MaskedApiKey = Omit<ApiKey, "value"> & {
  value: "••••••••";
  isPlaceholder: boolean;
  keyStatus: KeyStatus;
  valueLength: number;
};

export function maskKey(key: ApiKey): MaskedApiKey {
  return {
    ...key,
    value: "••••••••",
    isPlaceholder: isPlaceholderValue(key.value),
    keyStatus: computeStatus(key),
    valueLength: key.value.length,
  };
}

export function maskKeys(keys: ApiKey[]): MaskedApiKey[] {
  return keys.map(maskKey);
}
