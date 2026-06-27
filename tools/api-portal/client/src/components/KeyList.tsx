import { useState, useMemo, useCallback, useEffect } from "react";
import type { ApiKey, SyncTarget, KeyStatus } from "../api.js";
import KeyCard from "./KeyCard.js";
import AddEditDrawer from "./AddEditDrawer.js";
import { KEY_STATUS_FILTER_LABELS, PASTE_KEY_STEPS } from "../lib/portalCopy.js";
import { testAllKeys, testAllRapidApiHosts, testAllRapidApiEndpoints, ApiError } from "../api.js";

type Props = {
  keys: ApiKey[];
  syncTargets: SyncTarget[];
  onKeysChanged: (keys: ApiKey[]) => void;
  openKey?: ApiKey | null;
  onOpenKeyConsumed?: () => void;
};

type StatusFilter = "all" | KeyStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: KEY_STATUS_FILTER_LABELS.all },
  { value: "placeholder", label: KEY_STATUS_FILTER_LABELS.placeholder },
  { value: "untested", label: KEY_STATUS_FILTER_LABELS.untested },
  { value: "active", label: KEY_STATUS_FILTER_LABELS.active },
  { value: "inactive", label: KEY_STATUS_FILTER_LABELS.inactive },
  { value: "disabled", label: KEY_STATUS_FILTER_LABELS.disabled },
];

export default function KeyList({ keys, syncTargets, onKeysChanged, openKey, onOpenKeyConsumed }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [testingAll, setTestingAll] = useState(false);
  const [testingRapidApiFull, setTestingRapidApiFull] = useState(false);
  const [rapidApiFullMsg, setRapidApiFullMsg] = useState("");
  const [testAllMsg, setTestAllMsg] = useState("");
  const [rapidApiMsg, setRapidApiMsg] = useState("");
  const [hideDisabled, setHideDisabled] = useState(true);

  useEffect(() => {
    if (openKey) {
      setEditKey(openKey);
      setDrawerOpen(true);
      onOpenKeyConsumed?.();
    }
  }, [openKey, onOpenKeyConsumed]);

  const existingGroups = useMemo(() => [...new Set(keys.map((k) => k.serviceGroup))], [keys]);
  const projectNames = useMemo(() => syncTargets.map((t) => t.name), [syncTargets]);

  // Map: keyId → projects that use it
  const keyProjects = useMemo(() => {
    const map = new Map<string, SyncTarget[]>();
    for (const target of syncTargets) {
      for (const keyId of target.keyIds) {
        const list = map.get(keyId) ?? [];
        list.push(target);
        map.set(keyId, list);
      }
    }
    return map;
  }, [syncTargets]);

  // Keys that belong to a specific project
  const keysInProject = useMemo(() => {
    if (projectFilter === "all") return new Set(keys.map((k) => k.id));
    const target = syncTargets.find((t) => t.name === projectFilter);
    return new Set(target?.keyIds ?? []);
  }, [projectFilter, syncTargets, keys]);

  const envVarCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const k of keys) c.set(k.envVarName, (c.get(k.envVarName) ?? 0) + 1);
    return c;
  }, [keys]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return keys.filter((k) => {
      if (hideDisabled && k.disabled) return false;
      if (!keysInProject.has(k.id)) return false;
      if (statusFilter === "disabled" && !k.disabled) return false;
      if (statusFilter !== "all" && statusFilter !== "disabled" && k.keyStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        k.label.toLowerCase().includes(q) ||
        k.envVarName.toLowerCase().includes(q) ||
        k.serviceGroup.toLowerCase().includes(q)
      );
    });
  }, [keys, search, statusFilter, keysInProject, hideDisabled]);

  const grouped = useMemo(() => {
    const map = new Map<string, ApiKey[]>();
    for (const k of filtered) {
      const arr = map.get(k.serviceGroup) ?? [];
      arr.push(k);
      map.set(k.serviceGroup, arr);
    }
    return map;
  }, [filtered]);

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const handleSaved = useCallback((saved: ApiKey) => {
    onKeysChanged(
      editKey
        ? keys.map((k) => (k.id === saved.id ? saved : k))
        : [...keys, saved]
    );
    setDrawerOpen(false);
    setEditKey(null);
  }, [keys, editKey, onKeysChanged]);

  const handleDeleted = useCallback((id: string) => {
    onKeysChanged(keys.filter((k) => k.id !== id));
  }, [keys, onKeysChanged]);

  const handleKeysImported = useCallback((imported: ApiKey[]) => {
    const byId = new Map(keys.map((k) => [k.id, k]));
    for (const k of imported) byId.set(k.id, k);
    onKeysChanged([...byId.values()]);
    setDrawerOpen(false);
    setEditKey(null);
  }, [keys, onKeysChanged]);

  const handleUpdated = useCallback((updated: ApiKey) => {
    onKeysChanged(keys.map((k) => (k.id === updated.id ? updated : k)));
  }, [keys, onKeysChanged]);

  // Status counts for the filter bar
  const counts = useMemo(() => {
    const c = { all: 0, active: 0, inactive: 0, untested: 0, placeholder: 0, disabled: 0 };
    for (const k of keys) {
      if (!keysInProject.has(k.id)) continue;
      c.all++;
      if (k.disabled) { c.disabled++; continue; }
      c[k.keyStatus]++;
    }
    return c;
  }, [keys, keysInProject]);

  const handleTestAll = useCallback(async () => {
    setTestingAll(true);
    setTestAllMsg("");
    try {
      const { summary, keys: updated } = await testAllKeys();
      onKeysChanged(updated);
      setTestAllMsg(
        `Tested ${summary.tested}: ${summary.passed} work, ${summary.failed} failed` +
          (summary.skipped > 0 ? `, ${summary.skipped} skipped` : "")
      );
    } catch (e) {
      setTestAllMsg(e instanceof ApiError ? e.message : "Test run failed.");
    } finally {
      setTestingAll(false);
    }
  }, [onKeysChanged]);

  const handleTestRapidApi = useCallback(async () => {
    setTestingRapidApi(true);
    setRapidApiMsg("");
    try {
      const { summary, results } = await testAllRapidApiHosts();
      const failed = results.filter((r) => !r.ok);
      setRapidApiMsg(
        `RapidAPI hosts: ${summary.passed}/${summary.hosts} passed` +
          (failed.length > 0
            ? ` — subscribe or fix: ${failed.map((f) => f.label).join(", ")}`
            : "")
      );
    } catch (e) {
      setRapidApiMsg(e instanceof ApiError ? e.message : "RapidAPI test failed.");
    } finally {
      setTestingRapidApi(false);
    }
  }, []);

  const handleTestRapidApiFull = useCallback(async () => {
    setTestingRapidApiFull(true);
    setRapidApiFullMsg("");
    try {
      const { summary, results } = await testAllRapidApiEndpoints();
      const failed = results.filter((r) => !r.skipped && !r.ok);
      setRapidApiFullMsg(
        `All endpoints: ${summary.passed}/${summary.tested} passed` +
          (summary.skipped > 0 ? `, ${summary.skipped} skipped` : "") +
          (failed.length > 0 ? ` — failed: ${failed.map((f) => `${f.label}/${f.fn}`).join(", ")}` : "")
      );
    } catch (e) {
      setRapidApiFullMsg(e instanceof ApiError ? e.message : "Full RapidAPI test failed.");
    } finally {
      setTestingRapidApiFull(false);
    }
  }, []);

  const placeholderCount = useMemo(
    () => keys.filter((k) => !k.disabled && k.keyStatus === "placeholder").length,
    [keys]
  );

  return (
    <div>
      {placeholderCount > 0 && (
        <div className="paste-key-banner">
          <div className="paste-key-banner-title">Your one place for all API keys</div>
          <p className="paste-key-banner-lead">
            Paste each key once in this portal. We copy it to every app you link — no more hunting through
            project folders. Already have keys in an app&apos;s <code>.env.local</code>? Use
            &nbsp;<strong>Pull from all apps</strong> on the My Apps tab.
          </p>
          <ol className="paste-key-steps">
            {PASTE_KEY_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="paste-key-banner-foot">
            {placeholderCount} key{placeholderCount === 1 ? "" : "s"} still waiting for your secret.
          </p>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="key-list-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          className="search-input"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ height: 30, padding: "0 8px", fontSize: 12 }}
          aria-label="Show keys for which app"
        >
          <option value="all">All apps</option>
          {projectNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-sm ${statusFilter === opt.value ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setStatusFilter(opt.value)}
              style={{ fontSize: 11, padding: "3px 9px" }}
            >
              {opt.label}
              {opt.value !== "all" && counts[opt.value] > 0 && (
                <span style={{
                  marginLeft: 4,
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  padding: "0 5px",
                  fontSize: 10,
                }}>
                  {counts[opt.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          disabled={testingRapidApiFull}
          onClick={() => void handleTestRapidApiFull()}
          title="Probe every client endpoint path (full matrix)"
        >
          {testingRapidApiFull ? <span className="spinner" /> : null}
          Test all endpoints
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={testingRapidApi}
          onClick={() => void handleTestRapidApi()}
          title="Probe every RapidAPI host with your shared key"
        >
          {testingRapidApi ? <span className="spinner" /> : null}
          Test RapidAPI hosts
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={testingAll}
          onClick={() => void handleTestAll()}
          title="Test every key that has a test URL"
        >
          {testingAll ? <span className="spinner" /> : null}
          Test all keys
        </button>
        <label className="hide-disabled-toggle">
          <input
            type="checkbox"
            checked={hideDisabled}
            onChange={(e) => setHideDisabled(e.target.checked)}
          />
          Hide not in use
        </label>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setEditKey(null); setDrawerOpen(true); }}
        >
          + Add a new key
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setEditKey(null); setDrawerOpen(true); }}
        >
          Paste JSON
        </button>
      </div>

      {rapidApiFullMsg && (
        <div className={`curl-paste-message curl-paste-message--${rapidApiFullMsg.includes("failed:") ? "warn" : "ok"}`}>
          {rapidApiFullMsg}
        </div>
      )}

      {rapidApiMsg && (
        <div className={`curl-paste-message curl-paste-message--${rapidApiMsg.includes("failed") || rapidApiMsg.includes("subscribe") ? "warn" : "ok"}`}>
          {rapidApiMsg}
        </div>
      )}

      {testAllMsg && (
        <div className={`curl-paste-message curl-paste-message--${testAllMsg.includes("failed") && !testAllMsg.includes("0 failed") ? "warn" : "ok"}`}>
          {testAllMsg}
        </div>
      )}

      {/* ── Empty state ── */}
      {grouped.size === 0 && (
        <div className="empty-state">
          {search || statusFilter !== "all" || projectFilter !== "all"
            ? "No keys match what you searched for. Try changing the filters."
            : "No keys yet. Click “+ Add a new key” to get started."}
        </div>
      )}

      {/* ── Groups ── */}
      {[...grouped.entries()].map(([group, groupKeys]) => {
        const collapsed = collapsedGroups.has(group);
        const groupStatuses = groupKeys.map((k) => k.keyStatus);
        const hasEmpty = groupStatuses.includes("placeholder");
        const hasInactive = groupStatuses.includes("inactive");

        return (
          <div key={group} className="service-group">
            <div className="service-group-header" onClick={() => toggleGroup(group)}>
              <span>{collapsed ? "▶" : "▼"}</span>
              <span>{group}</span>
              <span className="group-count">{groupKeys.length}</span>
              {hasEmpty && <span style={{ color: "var(--yellow)", fontSize: 10 }}>⚠ paste your keys</span>}
              {hasInactive && !hasEmpty && <span style={{ color: "var(--red)", fontSize: 10 }}>✗ test failed</span>}
              <span style={{ flex: 1 }} />
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setEditKey(null); setDrawerOpen(true); }}
                style={{ fontSize: 11 }}
              >
                + Add key
              </button>
            </div>

            {!collapsed && groupKeys.map((k) => (
              <KeyCard
                key={k.id}
                apiKey={k}
                projectsUsingKey={keyProjects.get(k.id) ?? []}
                sameEnvVarCount={envVarCounts.get(k.envVarName) ?? 1}
                onEdit={(key) => { setEditKey(key); setDrawerOpen(true); }}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        );
      })}

      {drawerOpen && (
        <AddEditDrawer
          editKey={editKey}
          existingGroups={existingGroups}
          sharedEnvVarCount={editKey ? envVarCounts.get(editKey.envVarName) ?? 1 : 1}
          onSaved={handleSaved}
          onKeysImported={handleKeysImported}
          onClose={() => { setDrawerOpen(false); setEditKey(null); }}
        />
      )}
    </div>
  );
}
