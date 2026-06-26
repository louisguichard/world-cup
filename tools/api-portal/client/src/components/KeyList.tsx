import { useState, useMemo, useCallback } from "react";
import type { ApiKey, SyncTarget, KeyStatus } from "../api.js";
import KeyCard from "./KeyCard.js";
import AddEditDrawer from "./AddEditDrawer.js";

type Props = {
  keys: ApiKey[];
  syncTargets: SyncTarget[];
  onKeysChanged: (keys: ApiKey[]) => void;
};

type StatusFilter = "all" | KeyStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "placeholder", label: "Empty" },
  { value: "untested", label: "Untested" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function KeyList({ keys, syncTargets, onKeysChanged }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return keys.filter((k) => {
      if (!keysInProject.has(k.id)) return false;
      if (statusFilter !== "all" && k.keyStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        k.label.toLowerCase().includes(q) ||
        k.envVarName.toLowerCase().includes(q) ||
        k.serviceGroup.toLowerCase().includes(q)
      );
    });
  }, [keys, search, statusFilter, keysInProject]);

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

  const handleUpdated = useCallback((updated: ApiKey) => {
    onKeysChanged(keys.map((k) => (k.id === updated.id ? updated : k)));
  }, [keys, onKeysChanged]);

  // Status counts for the filter bar
  const counts = useMemo(() => {
    const c = { all: keys.length, active: 0, inactive: 0, untested: 0, placeholder: 0 };
    for (const k of keys) c[k.keyStatus]++;
    return c;
  }, [keys]);

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="key-list-header" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          className="search-input"
          placeholder="Search keys…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ height: 30, padding: "0 8px", fontSize: 12 }}
        >
          <option value="all">All Projects</option>
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
          className="btn btn-primary btn-sm"
          onClick={() => { setEditKey(null); setDrawerOpen(true); }}
        >
          + Add Key
        </button>
      </div>

      {/* ── Empty state ── */}
      {grouped.size === 0 && (
        <div className="empty-state">
          {search || statusFilter !== "all" || projectFilter !== "all"
            ? "No keys match the current filters."
            : "No keys yet. Click \"+ Add Key\" to get started."}
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
              {hasEmpty && <span style={{ color: "var(--text-faint)", fontSize: 10 }}>⚠ needs values</span>}
              {hasInactive && !hasEmpty && <span style={{ color: "var(--red)", fontSize: 10 }}>✗ inactive</span>}
              <span style={{ flex: 1 }} />
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setEditKey(null); setDrawerOpen(true); }}
                style={{ fontSize: 11 }}
              >
                + Add
              </button>
            </div>

            {!collapsed && groupKeys.map((k) => (
              <KeyCard
                key={k.id}
                apiKey={k}
                projectsUsingKey={keyProjects.get(k.id) ?? []}
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
          onSaved={handleSaved}
          onClose={() => { setDrawerOpen(false); setEditKey(null); }}
        />
      )}
    </div>
  );
}
