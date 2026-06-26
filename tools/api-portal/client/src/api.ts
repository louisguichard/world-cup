const BASE = "http://127.0.0.1:4242/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new ApiError(body.error ?? res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type KeyStatus = "active" | "inactive" | "untested" | "placeholder";

export type ApiKey = {
  id: string;
  serviceGroup: string;
  label: string;
  envVarName: string;
  /** Always "••••••••" when received from GET /api/keys */
  value: string;
  /** True if the real value is a placeholder like "FILL_ME_IN" */
  isPlaceholder: boolean;
  /** Length of the real value — safe to display */
  valueLength: number;
  /** Computed status from last test result */
  keyStatus: KeyStatus;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  testHeaders?: Record<string, string>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastTestStatus?: number;
  lastTestLatencyMs?: number;
};

export type VaultHistory = {
  id: string;
  timestamp: string;
  action: "create" | "update" | "delete" | "test" | "sync";
  keyId: string;
  label: string;
  envVarName: string;
  oldValueHash?: string;
  newValueHash?: string;
  meta?: string;
};

export type SyncTarget = {
  id: string;
  name: string;
  envFilePath: string;
  keyIds: string[];
  lastSyncedAt?: string;
};

export type StatusResponse = {
  keychainSetup: boolean;
  vaultExists: boolean;
  keychainAvailable: boolean;
  sessionUnlocked: boolean;
};

export type TestResult = {
  status: number;
  latencyMs: number;
  ok: boolean;
  body?: string;
};

export type ApiKeyCreate = {
  serviceGroup: string;
  label: string;
  envVarName: string;
  value: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  testHeaders?: Record<string, string>;
  notes?: string;
};

export type ScanEnvVar = {
  name: string;
  existingKeyId: string | null;
  existingLabel: string | null;
  existingIsPlaceholder: boolean | null;
  newValue: string | null;
};

// ─── Core API ─────────────────────────────────────────────────────────────────

export const getStatus = () => request<StatusResponse>("/status");

export const setupVault = (passphrase: string) =>
  request<{ ok: boolean }>("/setup", {
    method: "POST",
    body: JSON.stringify({ passphrase }),
  });

export const unlockSession = (passphrase: string) =>
  request<{ ok: boolean; sessionUnlocked: boolean }>("/unlock", {
    method: "POST",
    body: JSON.stringify({ passphrase }),
  });

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const getKeys = () => request<{ keys: ApiKey[] }>("/keys");

export const createKey = (data: ApiKeyCreate) =>
  request<{ key: ApiKey }>("/keys", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateKey = (id: string, data: Partial<ApiKeyCreate>) =>
  request<{ key: ApiKey }>(`/keys/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteKey = (id: string) =>
  request<{ ok: boolean }>(`/keys/${id}`, { method: "DELETE" });

export const revealKey = (id: string) =>
  request<{ value: string }>(`/keys/${id}/reveal`);

export const testKey = (id: string) =>
  request<TestResult>(`/keys/${id}/test`, { method: "POST" });

// ─── History ──────────────────────────────────────────────────────────────────

export const getHistory = () => request<{ history: VaultHistory[] }>("/history");

// ─── Sync targets ─────────────────────────────────────────────────────────────

export const getSyncTargets = () => request<{ targets: SyncTarget[] }>("/sync-targets");

export const createSyncTarget = (data: {
  name: string;
  envFilePath: string;
  keyIds: string[];
}) =>
  request<{ target: SyncTarget }>("/sync-targets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateSyncTarget = (
  id: string,
  data: Partial<{ name: string; envFilePath: string; keyIds: string[] }>
) =>
  request<{ target: SyncTarget }>(`/sync-targets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const syncTarget = (id: string) =>
  request<{ ok: boolean; keysWritten: number; filePath: string }>(`/sync-targets/${id}/sync`, {
    method: "POST",
  });

export const deleteSyncTarget = (id: string) =>
  request<{ ok: boolean }>(`/sync-targets/${id}`, { method: "DELETE" });

export const syncAll = async (): Promise<void> => {
  const { targets } = await getSyncTargets();
  await Promise.all(targets.map((t) => syncTarget(t.id)));
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const scanEnvFile = (envFilePath: string) =>
  request<{ vars: ScanEnvVar[]; filePath: string }>("/projects/scan-env", {
    method: "POST",
    body: JSON.stringify({ envFilePath }),
  });

export const importEnvFile = (data: {
  envFilePath: string;
  projectName: string;
  selectedVarNames: string[];
}) =>
  request<{ ok: boolean; imported: number; skipped: string[]; targetId: string }>(
    "/projects/import-env",
    { method: "POST", body: JSON.stringify(data) }
  );

export const createProject = (data: {
  projectName: string;
  envFilePath: string;
  serviceKeyIds: string[];
}) =>
  request<{ ok: boolean; target: SyncTarget; envCreated: boolean }>("/projects/create", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ─── Vault management ─────────────────────────────────────────────────────────

export const exportVault = async (): Promise<void> => {
  const res = await fetch(`${BASE}/vault/export`, { credentials: "include" });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vault-export.json";
  a.click();
  URL.revokeObjectURL(url);
};

export const importVault = (data: unknown) =>
  request<{ ok: boolean }>("/vault/import", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const resetVault = () =>
  request<{ ok: boolean }>("/vault/reset", {
    method: "POST",
    body: JSON.stringify({ confirm: "RESET VAULT" }),
  });
