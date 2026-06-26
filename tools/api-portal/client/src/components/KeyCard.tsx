import { useState, useEffect, useCallback, useRef } from "react";
import { revealKey, deleteKey, ApiError, type ApiKey, type TestResult, type KeyStatus, type SyncTarget } from "../api.js";
import TestRunner from "./TestRunner.js";

type RevealState = "hidden" | "loading" | "revealed";

type Props = {
  apiKey: ApiKey;
  projectsUsingKey: SyncTarget[];
  onEdit: (key: ApiKey) => void;
  onDeleted: (id: string) => void;
  onUpdated: (key: ApiKey) => void;
};

const REVEAL_DURATION = 30;

const STATUS_LABELS: Record<KeyStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  untested: "Untested",
  placeholder: "Empty",
};

function formatLastTested(key: ApiKey): string {
  if (key.isPlaceholder) return "No value set";
  if (!key.lastTestedAt) return key.endpoint ? "Never tested" : "No endpoint";
  const ago = Math.round((Date.now() - new Date(key.lastTestedAt).getTime()) / 1000 / 60);
  const agoStr = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  const s = key.lastTestStatus;
  const statusStr = s ? ` · ${s >= 200 && s < 300 ? "✓" : "✗"} ${s}` : "";
  const latency = key.lastTestLatencyMs ? ` · ${key.lastTestLatencyMs}ms` : "";
  return `${agoStr}${statusStr}${latency}`;
}

export default function KeyCard({ apiKey, projectsUsingKey, onEdit, onDeleted, onUpdated }: Props) {
  const [revealState, setRevealState] = useState<RevealState>("hidden");
  const [revealedValue, setRevealedValue] = useState("");
  const [countdown, setCountdown] = useState(REVEAL_DURATION);
  const [showTest, setShowTest] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(REVEAL_DURATION);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setRevealState("hidden");
          setRevealedValue("");
          return REVEAL_DURATION;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const handleReveal = useCallback(async () => {
    if (apiKey.isPlaceholder) return;
    setRevealState("loading");
    setError("");
    try {
      const { value } = await revealKey(apiKey.id);
      setRevealedValue(value);
      setRevealState("revealed");
      startCountdown();
    } catch (e) {
      setRevealState("hidden");
      setError(e instanceof ApiError ? e.message : "Reveal failed.");
    }
  }, [apiKey.id, apiKey.isPlaceholder, startCountdown]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await deleteKey(apiKey.id);
      onDeleted(apiKey.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }, [deleteConfirm, apiKey.id, onDeleted]);

  const handleTestDone = useCallback((result: TestResult) => {
    onUpdated({
      ...apiKey,
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: result.status,
      lastTestLatencyMs: result.latencyMs,
      keyStatus: result.ok ? "active" : "inactive",
    });
  }, [apiKey, onUpdated]);

  const hideReveal = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRevealState("hidden");
    setRevealedValue("");
  }, []);

  return (
    <div className="key-card">
      {/* ── Top row: env var name + status + service group + actions ── */}
      <div className="key-card-top">
        <span className="key-card-name">{apiKey.envVarName}</span>
        <span className={`key-status-pill ${apiKey.keyStatus}`}>
          {STATUS_LABELS[apiKey.keyStatus]}
        </span>
        <span className="key-card-group">{apiKey.serviceGroup}</span>
        <div className="key-card-actions">
          {!apiKey.isPlaceholder && (
            <button
              className="btn-icon"
              title={revealState === "revealed" ? "Hide value" : "Reveal value"}
              onClick={() => revealState === "revealed" ? hideReveal() : void handleReveal()}
            >
              {revealState === "loading"
                ? <span className="spinner" style={{ width: 12, height: 12 }} />
                : revealState === "revealed" ? "🙈" : "👁"}
            </button>
          )}
          <button className="btn-icon" title="Edit" onClick={() => onEdit(apiKey)}>✏</button>
          {!apiKey.isPlaceholder && apiKey.endpoint && (
            <button
              className="btn-icon"
              title="Test endpoint"
              onClick={() => setShowTest((s) => !s)}
              style={showTest ? { color: "var(--accent)" } : undefined}
            >
              🧪
            </button>
          )}
          <button
            className="btn-icon"
            title={deleteConfirm ? "Click again to confirm" : "Delete"}
            onClick={() => void handleDelete()}
            style={deleteConfirm ? { color: "var(--red)" } : undefined}
            onBlur={() => setDeleteConfirm(false)}
          >
            {deleteConfirm ? "⚠" : "🗑"}
          </button>
        </div>
      </div>

      {/* ── Label row ── */}
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
        {apiKey.label}
      </div>

      {/* ── Value row ── */}
      <div className="key-card-value-row">
        {apiKey.isPlaceholder ? (
          <div
            className="key-value-display"
            style={{ color: "var(--text-faint)", fontStyle: "italic", cursor: "pointer" }}
            onClick={() => onEdit(apiKey)}
            title="Click to add value"
          >
            Click ✏ to add value
          </div>
        ) : revealState === "revealed" ? (
          <>
            <div className="key-value-display revealed">{revealedValue}</div>
            <span className="reveal-countdown">Hides in {countdown}s</span>
          </>
        ) : (
          <>
            <div className="key-value-display">
              {"•".repeat(Math.min(apiKey.valueLength, 16))}
            </div>
            <span className="value-meta">{apiKey.valueLength} chars</span>
          </>
        )}
      </div>

      {/* ── Project tags ── */}
      {projectsUsingKey.length > 0 && (
        <div className="project-tags">
          {projectsUsingKey.map((p) => (
            <span key={p.id} className="project-tag">{p.name}</span>
          ))}
        </div>
      )}

      {/* ── Meta row: endpoint + last tested ── */}
      <div className="key-card-meta">
        {apiKey.endpoint && (
          <span className="endpoint" title={apiKey.endpoint}>
            {apiKey.endpoint}
          </span>
        )}
        {!apiKey.isPlaceholder && (
          <span>{formatLastTested(apiKey)}</span>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}

      {showTest && !apiKey.isPlaceholder && (
        <div style={{ marginTop: 8 }}>
          <TestRunner
            keyId={apiKey.id}
            keyName={apiKey.envVarName}
            endpoint={apiKey.endpoint}
            testMethod={apiKey.testMethod}
            onDone={handleTestDone}
          />
        </div>
      )}
    </div>
  );
}
