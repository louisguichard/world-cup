import { useState, useEffect, useCallback, useRef } from "react";
import {
  revealKey,
  deleteKey,
  updateKeyMeta,
  ApiError,
  type ApiKey,
  type TestResult,
  type SyncTarget,
} from "../api.js";
import TestRunner from "./TestRunner.js";
import { KEY_STATUS_LABELS } from "../lib/portalCopy.js";

type RevealState = "hidden" | "loading" | "revealed";

type Props = {
  apiKey: ApiKey;
  projectsUsingKey: SyncTarget[];
  sameEnvVarCount: number;
  onEdit: (key: ApiKey) => void;
  onDeleted: (id: string) => void;
  onUpdated: (key: ApiKey) => void;
};

const REVEAL_DURATION = 30;

function formatLastTested(key: ApiKey): string {
  if (key.disabled) return key.disabledReason ?? "Not used in linked app code";
  if (key.isPlaceholder) return "You have not pasted a key yet";
  if (!key.lastTestedAt) return key.endpoint ? "Never tested yet" : "No test website set";
  const ago = Math.round((Date.now() - new Date(key.lastTestedAt).getTime()) / 1000 / 60);
  const agoStr = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  const s = key.lastTestStatus;
  const statusStr = s ? ` · ${s >= 200 && s < 300 ? "✓" : "✗"} ${s}` : "";
  const latency = key.lastTestLatencyMs ? ` · ${key.lastTestLatencyMs}ms` : "";
  return `${agoStr}${statusStr}${latency}`;
}

export default function KeyCard({
  apiKey,
  projectsUsingKey,
  sameEnvVarCount,
  onEdit,
  onDeleted,
  onUpdated,
}: Props) {
  const [revealState, setRevealState] = useState<RevealState>("hidden");
  const [revealedValue, setRevealedValue] = useState("");
  const [countdown, setCountdown] = useState(REVEAL_DURATION);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [reenabling, setReenabling] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDisabled = Boolean(apiKey.disabled);
  const statusLabel = isDisabled ? KEY_STATUS_LABELS.disabled : KEY_STATUS_LABELS[apiKey.keyStatus];
  const statusClass = isDisabled ? "disabled" : apiKey.keyStatus;

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
    if (apiKey.isPlaceholder || isDisabled) return;
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
  }, [apiKey.id, apiKey.isPlaceholder, isDisabled, startCountdown]);

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

  const handleReenable = useCallback(async () => {
    setReenabling(true);
    setError("");
    try {
      const { key } = await updateKeyMeta(apiKey.id, {
        disabled: false,
        disabledReason: null,
        missingFromProjects: null,
      });
      onUpdated(key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not re-enable.");
    } finally {
      setReenabling(false);
    }
  }, [apiKey.id, onUpdated]);

  const hideReveal = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRevealState("hidden");
    setRevealedValue("");
  }, []);

  const canTest = !apiKey.isPlaceholder && Boolean(apiKey.endpoint);

  return (
    <div className={`key-card${isDisabled ? " key-card--disabled" : ""}`}>
      <div className="key-card-top">
        <span className="key-card-name">{apiKey.envVarName}</span>
        <span className={`key-status-pill ${statusClass}`}>{statusLabel}</span>
        <span className="key-card-group">{apiKey.serviceGroup}</span>
        <div className="key-card-actions">
          {!apiKey.isPlaceholder && !isDisabled && (
            <button
              type="button"
              className="btn-icon"
              title={revealState === "revealed" ? "Hide key" : "Show my key for 30 seconds"}
              onClick={() => revealState === "revealed" ? hideReveal() : void handleReveal()}
            >
              {revealState === "loading"
                ? <span className="spinner" style={{ width: 12, height: 12 }} />
                : revealState === "revealed" ? "🙈" : "👁"}
            </button>
          )}
          <button type="button" className="btn-icon" title="Edit / paste my key" onClick={() => onEdit(apiKey)}>✏</button>
          <button
            type="button"
            className="btn-icon"
            title={deleteConfirm ? "Click again to really delete" : "Delete this key"}
            onClick={() => void handleDelete()}
            style={deleteConfirm ? { color: "var(--red)" } : undefined}
            onBlur={() => setDeleteConfirm(false)}
          >
            {deleteConfirm ? "⚠" : "🗑"}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
        {apiKey.label}
        {sameEnvVarCount > 1 && (
          <span style={{ marginLeft: 8, color: "var(--accent)", fontSize: 11 }}>
            · shared code name ({sameEnvVarCount} slots)
          </span>
        )}
      </div>

      {isDisabled && (
        <div className="key-disabled-callout">
          <span>{apiKey.disabledReason ?? "Not found in linked app source code."}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={reenabling}
            onClick={() => void handleReenable()}
          >
            {reenabling ? <span className="spinner" /> : null}
            Re-enable
          </button>
        </div>
      )}

      {apiKey.missingFromProjects && apiKey.missingFromProjects.length > 0 && !isDisabled && (
        <div className="key-partial-missing">
          Not in code for: {apiKey.missingFromProjects.join(", ")}
          {projectsUsingKey.length > apiKey.missingFromProjects.length
            ? " (still used in other linked apps)"
            : ""}
        </div>
      )}

      {!isDisabled && (
        <div className="key-card-value-row">
          {apiKey.isPlaceholder ? (
            <div
              className="key-value-display key-value-display--empty"
              onClick={() => onEdit(apiKey)}
              title="Click to paste your secret key"
            >
              👆 Click ✏ to paste your secret API key here
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
      )}

      {projectsUsingKey.length > 0 && (
        <div className="project-tags">
          <span style={{ fontSize: 10, color: "var(--text-faint)", marginRight: 4 }}>Goes to:</span>
          {projectsUsingKey.map((p) => (
            <span
              key={p.id}
              className={`project-tag${apiKey.missingFromProjects?.includes(p.name) ? " project-tag--stale" : ""}`}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="key-card-meta">
        {apiKey.endpoint && (
          <span className="endpoint" title={apiKey.endpoint}>
            {apiKey.endpoint}
          </span>
        )}
        <span>{formatLastTested(apiKey)}</span>
      </div>

      {canTest && (
        <div className="key-card-test-row">
          <TestRunner
            keyId={apiKey.id}
            keyName={apiKey.envVarName}
            endpoint={apiKey.endpoint}
            testMethod={apiKey.testMethod}
            onDone={handleTestDone}
            compact
          />
        </div>
      )}

      {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
