import { useState, useCallback, useEffect } from "react";
import { testKey, ApiError, type TestResult } from "../api.js";

type RunnerState = "idle" | "running" | "success" | "failure";

type Props = {
  keyId: string;
  keyName: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  onDone?: (result: TestResult) => void;
  /** Compact inline row (always shows last result). */
  compact?: boolean;
  /** Run test as soon as the runner mounts. */
  autoRun?: boolean;
};

export default function TestRunner({
  keyId,
  keyName,
  endpoint,
  testMethod = "GET",
  onDone,
  compact = false,
  autoRun = false,
}: Props) {
  const [state, setState] = useState<RunnerState>("idle");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setState("running");
    setError("");
    try {
      const r = await testKey(keyId);
      setResult(r);
      setState(r.ok ? "success" : "failure");
      onDone?.(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Request failed.");
      setState("failure");
    }
  }, [keyId, onDone]);

  useEffect(() => {
    if (autoRun) void run();
  }, [autoRun, run]);

  if (compact) {
    return (
      <div className="test-runner test-runner--compact">
        <button
          type="button"
          className={`btn btn-sm ${state === "success" ? "btn-ghost" : state === "failure" ? "btn-ghost" : "btn-primary"}`}
          onClick={() => void run()}
          disabled={state === "running"}
          title={endpoint ? `Test ${endpoint}` : "Test this key"}
        >
          {state === "running" ? <span className="spinner" /> : null}
          {state === "running"
            ? "Testing…"
            : result
              ? result.ok
                ? `✓ Works (${result.status})`
                : `✗ Failed (${result.status || "error"})`
              : "Test key"}
        </button>
        {result && (
          <span className="test-runner-compact-meta">
            {result.latencyMs}ms
            {endpoint ? ` · ${testMethod}` : ""}
          </span>
        )}
        {error ? <span className="test-runner-compact-err">{error}</span> : null}
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button type="button" className="btn btn-sm btn-primary" onClick={() => void run()}>
        Test key
      </button>
    );
  }

  return (
    <div className="test-runner">
      {state === "running" && (
        <div className="test-runner-line info">
          <span className="spinner" style={{ verticalAlign: "middle", marginRight: 6 }} />
          Testing {keyName}…
        </div>
      )}

      {result && (
        <>
          <div className="test-runner-line info">→ {testMethod} {endpoint ?? "(no endpoint)"}</div>
          <div className={`test-runner-line ${result.ok ? "success" : "failure"}`}>
            {result.ok ? "✓ Works!" : "✗ Didn't work"}{" "}
            {result.status > 0 ? `(${result.status})` : ""}{" "}
            · {result.latencyMs}ms
          </div>
          {result.body && <div className="test-runner-body">{result.body}</div>}
        </>
      )}

      {error && <div className="test-runner-line failure">{error}</div>}

      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ marginTop: 8 }}
        onClick={() => void run()}
        disabled={state === "running"}
      >
        Test again
      </button>
    </div>
  );
}
