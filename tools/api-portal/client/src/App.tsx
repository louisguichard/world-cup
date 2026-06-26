import { useState, useEffect, useCallback } from "react";
import {
  getStatus,
  getKeys,
  getSyncTargets,
  syncAll,
  ApiError,
  type ApiKey,
  type SyncTarget,
  type StatusResponse,
} from "./api.js";
import SetupScreen from "./components/SetupScreen.js";
import KeyList from "./components/KeyList.js";
import HistoryLog from "./components/HistoryLog.js";
import SyncTargets from "./components/SyncTargets.js";
import Settings from "./components/Settings.js";

type NavTab = "keys" | "history" | "sync" | "settings";

const NAV_ITEMS: { id: NavTab; label: string; icon: string }[] = [
  { id: "keys", label: "Keys", icon: "🔑" },
  { id: "history", label: "History", icon: "📋" },
  { id: "sync", label: "Projects", icon: "⟳" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [syncTargets, setSyncTargets] = useState<SyncTarget[]>([]);
  const [nav, setNav] = useState<NavTab>("keys");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [connectionError, setConnectionError] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await getStatus();
      setStatus(s);
      setConnectionError(false);
    } catch {
      setConnectionError(true);
    }
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const { keys: k } = await getKeys();
      setKeys(k);
    } catch {
      // surfaced per-component
    }
  }, []);

  const loadSyncTargets = useCallback(async () => {
    try {
      const { targets } = await getSyncTargets();
      setSyncTargets(targets);
    } catch {
      // surfaced per-component
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadKeys(), loadSyncTargets()]);
  }, [loadKeys, loadSyncTargets]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status && (status.keychainSetup || status.sessionUnlocked)) {
      void loadAll();
    }
  }, [status, loadAll]);

  const handleSetupComplete = useCallback(async () => {
    await loadStatus();
    await loadAll();
  }, [loadStatus, loadAll]);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setSyncError("");
    try {
      await syncAll();
      await loadSyncTargets();
    } catch (e) {
      setSyncError(e instanceof ApiError ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [loadSyncTargets]);

  const handleReset = useCallback(async () => {
    await loadStatus();
    setKeys([]);
    setSyncTargets([]);
    setNav("keys");
  }, [loadStatus]);

  // Count keys by status for header badge
  const emptyCount = keys.filter((k) => k.isPlaceholder).length;
  const inactiveCount = keys.filter((k) => k.keyStatus === "inactive").length;

  if (connectionError) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <h1>Cannot connect to server</h1>
          <p>
            Make sure the API Vault server is running at{" "}
            <code style={{ fontFamily: "var(--mono)" }}>http://127.0.0.1:4242</code>.
          </p>
          <p style={{ marginTop: 8 }}>
            From the repo root, run: <code style={{ fontFamily: "var(--mono)" }}>npm run dev:portal</code>
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: 10 }}
            onClick={() => void loadStatus()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="setup-screen">
        <div className="setup-card" style={{ alignItems: "center" }}>
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p>Connecting to vault server…</p>
        </div>
      </div>
    );
  }

  const isReady = status.keychainSetup || status.sessionUnlocked;

  if (!isReady) {
    return (
      <SetupScreen
        keychainAvailable={status.keychainAvailable}
        onSetupComplete={() => void handleSetupComplete()}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">🔐 API Vault</span>
        {emptyCount > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--yellow-dim)",
              color: "var(--yellow)",
              cursor: "pointer",
            }}
            onClick={() => setNav("keys")}
            title="Some keys need values"
          >
            {emptyCount} empty
          </span>
        )}
        {inactiveCount > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--red-dim)",
              color: "var(--red)",
              cursor: "pointer",
            }}
            onClick={() => setNav("keys")}
            title="Some keys failed their last test"
          >
            {inactiveCount} inactive
          </span>
        )}
        <span style={{ flex: 1 }} />
        {syncError && <span style={{ fontSize: 11, color: "var(--red)" }}>{syncError}</span>}
        <button
          className="btn btn-ghost btn-sm"
          disabled={syncing}
          onClick={() => void handleSyncAll()}
        >
          {syncing ? <span className="spinner" /> : null}
          Sync All
        </button>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item${nav === item.id ? " active" : ""}`}
              onClick={() => setNav(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "sync" && syncTargets.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    background: "var(--surface-raised)",
                    borderRadius: 999,
                    padding: "0 5px",
                    color: "var(--text-faint)",
                  }}
                >
                  {syncTargets.length}
                </span>
              )}
            </div>
          ))}
        </nav>

        <main className="main-panel">
          {nav === "keys" && (
            <KeyList
              keys={keys}
              syncTargets={syncTargets}
              onKeysChanged={setKeys}
            />
          )}
          {nav === "history" && <HistoryLog />}
          {nav === "sync" && (
            <SyncTargets
              onTargetsChanged={() => void loadAll()}
            />
          )}
          {nav === "settings" && (
            <Settings status={status} onReset={() => void handleReset()} />
          )}
        </main>
      </div>
    </div>
  );
}
