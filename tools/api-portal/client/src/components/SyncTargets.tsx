import { useState, useEffect, useCallback } from "react";
import {
  getSyncTargets,
  createSyncTarget,
  updateSyncTarget,
  syncTarget,
  deleteSyncTarget,
  getKeys,
  scanEnvFile,
  importEnvFile,
  createProject,
  pullAllProjects,
  rescanProjects,
  applyDiscoveredKeys,
  ApiError,
  type SyncTarget,
  type ApiKey,
  type ScanEnvVar,
  type ProjectScanResult,
  type DiscoveredEnvVar,
} from "../api.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSynced(iso?: string): string {
  if (!iso) return "Never copied to app yet";
  const ago = Math.round((Date.now() - new Date(iso).getTime()) / 1000 / 60);
  if (ago < 1) return "Just now";
  if (ago < 60) return `${ago}m ago`;
  return `${Math.round(ago / 60)}h ago`;
}

type Mode = "list" | "add-manual" | "import-env" | "new-project";

// ─── Import .env flow ─────────────────────────────────────────────────────────

function ImportEnvFlow({
  keys,
  onDone,
  onCancel,
}: {
  keys: ApiKey[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [path, setPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scanned, setScanned] = useState<ScanEnvVar[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleScan = useCallback(async () => {
    if (!path.trim()) { setError("Enter a path first."); return; }
    setScanning(true);
    setError("");
    setScanned(null);
    try {
      const { vars } = await scanEnvFile(path.trim());
      setScanned(vars);
      // Pre-select: new vars + placeholders that can be filled
      const preSelected = new Set(
        vars
          .filter((v) => !v.existingKeyId || v.existingIsPlaceholder)
          .map((v) => v.name)
      );
      setSelected(preSelected);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }, [path]);

  const handleImport = useCallback(async () => {
    if (!projectName.trim()) { setError("Project name required."); return; }
    if (selected.size === 0) { setError("Select at least one variable to import."); return; }
    setImporting(true);
    setError("");
    try {
      const result = await importEnvFile({
        envFilePath: path.trim(),
        projectName: projectName.trim(),
        selectedVarNames: [...selected],
      });
      console.log(`Imported ${result.imported} keys, skipped ${result.skipped.length}`);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }, [path, projectName, selected, onDone]);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="add-target-form">
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        Bring keys from an existing app file
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        If your app already has a <code>.env.local</code> file with keys, scan it to copy them into this key box.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>Where is your app&apos;s secret file?</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={path}
            onChange={(e) => { setPath(e.target.value); setScanned(null); }}
            placeholder="/Users/you/Developer/my-project/.env.local"
            style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12 }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleScan(); }}
          />
          <button className="btn btn-ghost btn-sm" disabled={scanning} onClick={() => void handleScan()}>
            {scanning ? <span className="spinner" /> : "Scan"}
          </button>
        </div>
      </div>

      {scanned && (
        <>
          <div className="field">
            <label>What should we call this app?</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. World Cup Tracker"
            />
          </div>

          <div className="field">
            <label>Pick which keys to copy in ({scanned.length} found)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {scanned.map((v) => {
                const isChecked = selected.has(v.name);
                const alreadyFilled = v.existingKeyId && !v.existingIsPlaceholder;
                return (
                  <label
                    key={v.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "var(--surface-raised)",
                      borderRadius: "var(--radius-sm)",
                      cursor: alreadyFilled ? "not-allowed" : "pointer",
                      opacity: alreadyFilled ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!!alreadyFilled}
                      onChange={() => toggle(v.name)}
                    />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, flex: 1 }}>{v.name}</span>
                    {v.existingKeyId && (
                      <span style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: v.existingIsPlaceholder ? "var(--yellow-dim)" : "var(--green-dim)",
                        color: v.existingIsPlaceholder ? "var(--yellow)" : "var(--green)",
                      }}>
                        {v.existingIsPlaceholder ? "will fill in" : "already has key"}
                      </span>
                    )}
                    {!v.existingKeyId && (
                      <span style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}>new</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {selected.size} of {scanned.filter(v => !v.existingKeyId || v.existingIsPlaceholder).length} importable selected
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={importing || selected.size === 0}
                onClick={() => void handleImport()}
              >
                {importing ? <span className="spinner" /> : `Copy ${selected.size} keys`}
              </button>
            </div>
          </div>
        </>
      )}

      {!scanned && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── New Project flow ─────────────────────────────────────────────────────────

function NewProjectFlow({
  keys,
  onDone,
  onCancel,
}: {
  keys: ApiKey[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [envPath, setEnvPath] = useState("");
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleKey = (id: string) =>
    setSelectedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { setError("Project name required."); return; }
    if (!envPath.trim()) { setError("Path required."); return; }
    setSaving(true);
    setError("");
    try {
      await createProject({
        projectName: name.trim(),
        envFilePath: envPath.trim(),
        serviceKeyIds: [...selectedKeyIds],
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }, [name, envPath, selectedKeyIds, onDone]);

  // Group keys for easy selection
  const groups = new Map<string, ApiKey[]>();
  for (const k of keys) {
    const arr = groups.get(k.serviceGroup) ?? [];
    arr.push(k);
    groups.set(k.serviceGroup, arr);
  }

  return (
    <div className="add-target-form">
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Add a new app</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        Tell us where your app lives. We will create a secret file there and copy your keys when you click “Send keys to my apps”.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>App name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. World Cup Tracker"
          autoFocus
        />
      </div>

      <div className="field">
        <label>Where should the secret file go?</label>
        <input
          value={envPath}
          onChange={(e) => setEnvPath(e.target.value)}
          placeholder="/Users/you/Developer/my-new-app/.env.local"
          style={{ fontFamily: "var(--mono)", fontSize: 12 }}
        />
        <div className="field-hint">We create <code>.env.local</code> if it does not exist. The folder must already exist.</div>
      </div>

      <div className="field">
        <label>Which keys does this app use? <span className="label-optional">(you can change later)</span></label>
        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {[...groups.entries()].map(([group, groupKeys]) => (
            <div key={group}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                {group}
              </div>
              <div className="key-checkboxes">
                {groupKeys.map((k) => (
                  <label key={k.id} className="key-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedKeyIds.has(k.id)}
                      onChange={() => toggleKey(k.id)}
                    />
                    <span style={{ fontFamily: "var(--mono)" }}>{k.envVarName}</span>
                    {k.isPlaceholder && (
                      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>(needs your key)</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary btn-sm"
          disabled={saving}
          onClick={() => void handleCreate()}
        >
          {saving ? <span className="spinner" /> : "Add this app"}
        </button>
      </div>
    </div>
  );
}

// ─── Edit target (keys selection) ────────────────────────────────────────────

function EditTargetForm({
  target,
  keys,
  onSave,
  onCancel,
}: {
  target: SyncTarget;
  keys: ApiKey[];
  onSave: (updated: { keyIds: string[] }) => void;
  onCancel: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(target.keyIds));

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups = new Map<string, ApiKey[]>();
  for (const k of keys) {
    const arr = groups.get(k.serviceGroup) ?? [];
    arr.push(k);
    groups.set(k.serviceGroup, arr);
  }

  return (
    <div className="add-target-form">
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
        Edit which keys go to: {target.name}
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {[...groups.entries()].map(([group, groupKeys]) => (
          <div key={group}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
              {group}
            </div>
            <div className="key-checkboxes">
              {groupKeys.map((k) => (
                <label key={k.id} className="key-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(k.id)}
                    onChange={() => toggle(k.id)}
                  />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{k.envVarName}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onSave({ keyIds: [...selectedIds] })}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Detect keys in project source ───────────────────────────────────────────

function DetectKeysPanel({
  result,
  selected,
  onToggle,
  onSelectAll,
  onApply,
  applying,
  onDismiss,
}: {
  result: ProjectScanResult;
  selected: Set<string>;
  onToggle: (name: string) => void;
  onSelectAll: (names: string[]) => void;
  onApply: () => void;
  applying: boolean;
  onDismiss: () => void;
}) {
  const actionable = result.unassigned;
  const allSelected = actionable.length > 0 && actionable.every((v) => selected.has(v.name));

  return (
    <div className="detect-keys-panel">
      {result.staleAssigned.length > 0 && (
        <div className="detect-stale-keys">
          <strong>{result.staleAssigned.length} assigned key(s) no longer in this app&apos;s code</strong>
          <ul>
            {result.staleAssigned.map((k) => (
              <li key={k.keyId}>
                <code>{k.envVarName}</code> — {k.label}
                <span className="detect-stale-tag">auto-disabled if unused everywhere</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actionable.length === 0 ? (
        <div className="detect-keys-panel--ok" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>All {result.discovered.length} key(s) in code are assigned to this app.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>
        </div>
      ) : (
        <>
      <div className="detect-keys-head">
        <strong>
          {actionable.length} key{actionable.length === 1 ? "" : "s"} in code not assigned to this app
        </strong>
        <span className="detect-keys-meta">Scanned {result.rootPath}</span>
      </div>
      <div className="detect-keys-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onSelectAll(allSelected ? [] : actionable.map((v) => v.name))}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <ul className="detect-keys-list">
        {actionable.map((v: DiscoveredEnvVar) => (
          <li key={v.name}>
            <label className="mcp-endpoint-option">
              <input
                type="checkbox"
                checked={selected.has(v.name)}
                onChange={() => onToggle(v.name)}
              />
              <span className="mcp-endpoint-option-text">
                <code>{v.name}</code>
                <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
                  {v.inVault ? " · in vault" : " · new"}
                  {v.inEnvFile && !v.envFileValueIsPlaceholder ? " · has value in .env" : ""}
                  {" · "}
                  {v.sources.slice(0, 2).join(", ")}
                  {v.sources.length > 2 ? ` +${v.sources.length - 2}` : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="detect-keys-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={applying || selected.size === 0}
          onClick={onApply}
        >
          {applying ? <span className="spinner" /> : null}
          Add {selected.size} to vault &amp; app
        </button>
      </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  onTargetsChanged?: () => void;
  onKeysChanged?: (keys: ApiKey[]) => void;
};

export default function SyncTargets({ onTargetsChanged, onKeysChanged }: Props) {
  const [targets, setTargets] = useState<SyncTarget[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("list");
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullMsg, setPullMsg] = useState("");
  const [detecting, setDetecting] = useState<string | "all" | null>(null);
  const [scanResults, setScanResults] = useState<Map<string, ProjectScanResult>>(new Map());
  const [detectSelected, setDetectSelected] = useState<Map<string, Set<string>>>(new Map());
  const [applyingDetect, setApplyingDetect] = useState<string | null>(null);
  const [detectMsg, setDetectMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ targets: t }, { keys: k }] = await Promise.all([getSyncTargets(), getKeys()]);
      setTargets(t);
      setKeys(k);
    } catch {
      setError("Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = useCallback(async (id: string) => {
    setSyncing(id);
    setError("");
    try {
      await syncTarget(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sync failed.");
    } finally {
      setSyncing(null);
    }
  }, [load]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete sync target "${name}"? Your .env.local will not be changed.`)) return;
    try {
      await deleteSyncTarget(id);
      setTargets((t) => t.filter((x) => x.id !== id));
      onTargetsChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }, [onTargetsChanged]);

  const handleEditSave = useCallback(async (targetId: string, data: { keyIds: string[] }) => {
    try {
      const { target: updated } = await updateSyncTarget(targetId, data);
      setTargets((prev) => prev.map((t) => (t.id === targetId ? updated : t)));
      setEditingTargetId(null);
      onTargetsChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    }
  }, [onTargetsChanged]);

  const handleFlowDone = useCallback(async () => {
    setMode("list");
    await load();
    onTargetsChanged?.();
  }, [load, onTargetsChanged]);

  const handleDetectTarget = useCallback(async (target: SyncTarget) => {
    setDetecting(target.id);
    setDetectMsg("");
    setError("");
    try {
      const { results, usage, keys } = await rescanProjects({ targetId: target.id });
      const result = results[0];
      if (!result) return;
      onKeysChanged?.(keys);
      setScanResults((prev) => new Map(prev).set(target.id, result));
      setDetectSelected((prev) => {
        const next = new Map(prev);
        next.set(target.id, new Set(result.unassigned.map((v) => v.name)));
        return next;
      });
      if (usage.disabled.length > 0) {
        setDetectMsg(`Disabled ${usage.disabled.length} key(s) not found in code: ${usage.disabled.join(", ")}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Scan failed.");
    } finally {
      setDetecting(null);
    }
  }, [onKeysChanged]);

  const handleDetectAll = useCallback(async () => {
    setDetecting("all");
    setDetectMsg("");
    setError("");
    try {
      const { results, usage, keys } = await rescanProjects();
      onKeysChanged?.(keys);
      const next = new Map<string, ProjectScanResult>();
      const sel = new Map<string, Set<string>>();
      let totalNew = 0;
      for (const r of results) {
        const id = r.targetId ?? r.envFilePath;
        next.set(id, r);
        if (r.unassigned.length > 0) {
          sel.set(id, new Set(r.unassigned.map((v) => v.name)));
          totalNew += r.unassigned.length;
        }
      }
      setScanResults(next);
      setDetectSelected(sel);
      if (totalNew === 0) {
        const disabledNote =
          usage.disabled.length > 0
            ? ` Disabled ${usage.disabled.length} unused key(s).`
            : "";
        setDetectMsg(`All apps are up to date — every key in code is already assigned.${disabledNote}`);
      } else {
        setDetectMsg(
          `Found ${totalNew} unassigned key(s) across ${results.length} app(s). Review each app below.` +
            (usage.disabled.length > 0 ? ` Disabled ${usage.disabled.length} unused.` : "")
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Scan failed.");
    } finally {
      setDetecting(null);
    }
  }, [onKeysChanged]);

  const toggleDetectVar = useCallback((targetKey: string, name: string) => {
    setDetectSelected((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(targetKey) ?? []);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      next.set(targetKey, set);
      return next;
    });
  }, []);

  const handleApplyDetect = useCallback(
    async (result: ProjectScanResult, targetKey: string) => {
      const varNames = [...(detectSelected.get(targetKey) ?? [])];
      if (varNames.length === 0) return;
      setApplyingDetect(targetKey);
      setError("");
      try {
        const { keys } = await applyDiscoveredKeys({
          targetId: result.targetId ?? undefined,
          projectName: result.projectName,
          envFilePath: result.envFilePath,
          varNames,
          pullValuesFromEnv: true,
        });
        onKeysChanged?.(keys);
        setScanResults((prev) => {
          const next = new Map(prev);
          next.delete(targetKey);
          return next;
        });
        setDetectSelected((prev) => {
          const next = new Map(prev);
          next.delete(targetKey);
          return next;
        });
        setDetectMsg(`Added ${varNames.length} key(s) to ${result.projectName}. Paste any that still say “needs your key”.`);
        await load();
        onTargetsChanged?.();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not add keys.");
      } finally {
        setApplyingDetect(null);
      }
    },
    [detectSelected, load, onTargetsChanged, onKeysChanged]
  );

  const handlePullAll = useCallback(async () => {
    setPulling(true);
    setPullMsg("");
    setError("");
    try {
      const { pulled, results } = await pullAllProjects();
      const missing = results.filter((r) => !r.found).map((r) => r.projectName);
      if (pulled > 0) {
        setPullMsg(`Pulled ${pulled} key(s) from your app files into the vault.`);
      } else if (missing.length > 0) {
        setPullMsg(`No real keys found on disk. Paste keys in My Secret Keys, or add keys to your app files first.`);
      } else {
        setPullMsg("No real keys in app files yet (still placeholders). Paste keys in the portal instead.");
      }
      await load();
      onTargetsChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pull failed.");
    } finally {
      setPulling(false);
    }
  }, [load, onTargetsChanged]);

  const keyLabel = useCallback((t: SyncTarget) => {
    const names = t.keyIds
      .map((id) => keys.find((k) => k.id === id)?.envVarName ?? id)
      .filter(Boolean);
    if (names.length === 0) return "No keys picked yet";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} (+${names.length - 3} more)`;
  }, [keys]);

  const statusSummary = useCallback((t: SyncTarget) => {
    const targetKeys = t.keyIds.map((id) => keys.find((k) => k.id === id)).filter(Boolean) as ApiKey[];
    const empty = targetKeys.filter((k) => k.isPlaceholder).length;
    const inactive = targetKeys.filter((k) => k.keyStatus === "inactive").length;
    if (empty > 0) return { label: `${empty} need your key`, color: "var(--yellow)" };
    if (inactive > 0) return { label: `${inactive} didn't work`, color: "var(--red)" };
    const untested = targetKeys.filter((k) => k.keyStatus === "untested").length;
    if (untested === targetKeys.length) return { label: "not checked yet", color: "var(--yellow)" };
    const active = targetKeys.filter((k) => k.keyStatus === "active").length;
    if (active > 0) return { label: `${active} work!`, color: "var(--green)" };
    return { label: "ready", color: "var(--text-dim)" };
  }, [keys]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="page-title" style={{ marginBottom: 0, flex: 1 }}>My Apps</div>
        {mode === "list" && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              disabled={pulling || detecting !== null}
              onClick={() => void handlePullAll()}
            >
              {pulling ? <span className="spinner" /> : null}
              ↑ Pull from all apps
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={detecting !== null}
              onClick={() => void handleDetectAll()}
            >
              {detecting === "all" ? <span className="spinner" /> : null}
              ↻ Reload &amp; detect keys
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode("import-env")}>
              ↓ Link one file
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setMode("new-project")}>
              + Add app
            </button>
          </>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {pullMsg && <div className="curl-paste-message curl-paste-message--ok">{pullMsg}</div>}
      {detectMsg && <div className="curl-paste-message curl-paste-message--ok">{detectMsg}</div>}

      <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 }}>
        Link each app once. After you paste or change keys in <strong>My Secret Keys</strong>, click
        &nbsp;<strong>Send keys to my apps</strong> in the header — or <strong>Copy keys to this app</strong> below.
        Use <strong>Reload &amp; detect keys</strong> after adding new API clients in your code.
      </p>

      {/* ── Import / New Project flows ── */}
      {mode === "import-env" && (
        <ImportEnvFlow
          keys={keys}
          onDone={() => void handleFlowDone()}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "new-project" && (
        <NewProjectFlow
          keys={keys}
          onDone={() => void handleFlowDone()}
          onCancel={() => setMode("list")}
        />
      )}

      {/* ── Target list ── */}
      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : targets.length === 0 && mode === "list" ? (
        <div className="empty-state">
          No apps yet. Link an existing secret file, or add a new app.
        </div>
      ) : (
        targets.map((t) => {
          const summary = statusSummary(t);
          const isEditing = editingTargetId === t.id;
          const scanKey = t.id;
          const scanResult = scanResults.get(scanKey) ?? scanResults.get(t.envFilePath);
          const detectSel = detectSelected.get(scanKey) ?? detectSelected.get(t.envFilePath) ?? new Set<string>();
          return (
            <div key={t.id} className="sync-target-card" style={{ marginBottom: 12 }}>
              <div className="sync-target-header">
                <span className="sync-target-name">{t.name}</span>
                <span style={{ fontSize: 11, color: summary.color }}>{summary.label}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={detecting !== null}
                  title="Scan source code for new API key env vars"
                  onClick={() => void handleDetectTarget(t)}
                >
                  {detecting === t.id ? <span className="spinner" /> : "↻ Detect"}
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={syncing === t.id}
                  onClick={() => void handleSync(t.id)}
                >
                  {syncing === t.id ? <span className="spinner" /> : "Copy keys to this app"}
                </button>
                <button
                  className="btn-icon"
                  title="Change which keys this app gets"
                  style={isEditing ? { color: "var(--accent)" } : undefined}
                  onClick={() => setEditingTargetId(isEditing ? null : t.id)}
                >✏</button>
                <button
                  className="btn-icon"
                  title="Remove this app from the list"
                  onClick={() => void handleDelete(t.id, t.name)}
                >🗑</button>
              </div>

              <div className="sync-target-path">{t.envFilePath}</div>
              <div className="sync-target-keys">Keys for this app: {keyLabel(t)}</div>
              {t.keyIds.length > 0 && (
                <ul className="sync-target-key-list">
                  {t.keyIds.map((id) => {
                    const k = keys.find((x) => x.id === id);
                    if (!k) return null;
                    const stale = k.disabled || k.missingFromProjects?.includes(t.name);
                    return (
                      <li key={id} className={`sync-target-key-row${stale ? " sync-target-key-row--stale" : ""}`}>
                        <code>{k.envVarName}</code>
                        <span className="sync-target-key-label">{k.label}</span>
                        <span className={`key-status-pill ${k.disabled ? "disabled" : k.keyStatus}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                          {k.disabled ? "not in use" : k.isPlaceholder ? "needs key" : k.keyStatus}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="sync-target-last">
                {formatLastSynced(t.lastSyncedAt)}
              </div>

              {isEditing && (
                <div style={{ marginTop: 12 }}>
                  <EditTargetForm
                    target={t}
                    keys={keys}
                    onSave={(data) => void handleEditSave(t.id, data)}
                    onCancel={() => setEditingTargetId(null)}
                  />
                </div>
              )}

              {scanResult && !isEditing ? (
                <DetectKeysPanel
                  result={scanResult}
                  selected={detectSel}
                  onToggle={(name) => toggleDetectVar(scanKey, name)}
                  onSelectAll={(names) => {
                    setDetectSelected((prev) => {
                      const next = new Map(prev);
                      next.set(scanKey, new Set(names));
                      return next;
                    });
                  }}
                  onApply={() => void handleApplyDetect(scanResult, scanKey)}
                  applying={applyingDetect === scanKey}
                  onDismiss={() => {
                    setScanResults((prev) => {
                      const next = new Map(prev);
                      next.delete(scanKey);
                      next.delete(t.envFilePath);
                      return next;
                    });
                  }}
                />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
