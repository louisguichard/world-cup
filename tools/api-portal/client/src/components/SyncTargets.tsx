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
  ApiError,
  type SyncTarget,
  type ApiKey,
  type ScanEnvVar,
} from "../api.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSynced(iso?: string): string {
  if (!iso) return "Never synced";
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
        Import from existing .env file
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        Scan a project's .env.local to import its key values into the vault and register a sync target.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>Path to .env.local</label>
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
            <label>Project Name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. My New App"
            />
          </div>

          <div className="field">
            <label>Variables found ({scanned.length}) — select which to import</label>
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
                        {v.existingIsPlaceholder ? "will fill" : "already set"}
                      </span>
                    )}
                    {!v.existingKeyId && (
                      <span style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}>new key</span>
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
                {importing ? <span className="spinner" /> : `Import ${selected.size} vars`}
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
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>New Project</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        Create a new project entry with an empty .env.local. Associate existing vault keys — they'll be synced on the first "Sync Now" click.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>Project Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My New App"
          autoFocus
        />
      </div>

      <div className="field">
        <label>Path for .env.local</label>
        <input
          value={envPath}
          onChange={(e) => setEnvPath(e.target.value)}
          placeholder="/Users/you/Developer/my-new-app/.env.local"
          style={{ fontFamily: "var(--mono)", fontSize: 12 }}
        />
        <div className="field-hint">File will be created if it doesn't exist (parent directory must exist).</div>
      </div>

      <div className="field">
        <label>Associate API Keys (optional — can add later)</label>
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
                      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>(empty)</span>
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
          {saving ? <span className="spinner" /> : "Create Project"}
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
        Edit keys for: {target.name}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function SyncTargets({ onTargetsChanged }: { onTargetsChanged?: () => void }) {
  const [targets, setTargets] = useState<SyncTarget[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("list");
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

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

  const keyLabel = useCallback((t: SyncTarget) => {
    const names = t.keyIds
      .map((id) => keys.find((k) => k.id === id)?.envVarName ?? id)
      .filter(Boolean);
    if (names.length === 0) return "No keys";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} (+${names.length - 3} more)`;
  }, [keys]);

  const statusSummary = useCallback((t: SyncTarget) => {
    const targetKeys = t.keyIds.map((id) => keys.find((k) => k.id === id)).filter(Boolean) as ApiKey[];
    const empty = targetKeys.filter((k) => k.isPlaceholder).length;
    const inactive = targetKeys.filter((k) => k.keyStatus === "inactive").length;
    if (empty > 0) return { label: `${empty} empty`, color: "var(--text-faint)" };
    if (inactive > 0) return { label: `${inactive} inactive`, color: "var(--red)" };
    const untested = targetKeys.filter((k) => k.keyStatus === "untested").length;
    if (untested === targetKeys.length) return { label: "untested", color: "var(--yellow)" };
    const active = targetKeys.filter((k) => k.keyStatus === "active").length;
    if (active > 0) return { label: `${active} active`, color: "var(--green)" };
    return { label: "ready", color: "var(--text-dim)" };
  }, [keys]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="page-title" style={{ marginBottom: 0, flex: 1 }}>Projects</div>
        {mode === "list" && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode("import-env")}>
              ↓ Link .env file
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setMode("new-project")}>
              + New Project
            </button>
          </>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

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
          No projects yet. Click "Link .env file" to import an existing project, or
          "+ New Project" to create a new one.
        </div>
      ) : (
        targets.map((t) => {
          const summary = statusSummary(t);
          const isEditing = editingTargetId === t.id;
          return (
            <div key={t.id} className="sync-target-card" style={{ marginBottom: 12 }}>
              <div className="sync-target-header">
                <span className="sync-target-name">{t.name}</span>
                <span style={{ fontSize: 11, color: summary.color }}>{summary.label}</span>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={syncing === t.id}
                  onClick={() => void handleSync(t.id)}
                >
                  {syncing === t.id ? <span className="spinner" /> : "Sync Now"}
                </button>
                <button
                  className="btn-icon"
                  title="Edit key associations"
                  style={isEditing ? { color: "var(--accent)" } : undefined}
                  onClick={() => setEditingTargetId(isEditing ? null : t.id)}
                >✏</button>
                <button
                  className="btn-icon"
                  title="Remove project"
                  onClick={() => void handleDelete(t.id, t.name)}
                >🗑</button>
              </div>

              <div className="sync-target-path">{t.envFilePath}</div>
              <div className="sync-target-keys">Keys: {keyLabel(t)}</div>
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
            </div>
          );
        })
      )}
    </div>
  );
}
