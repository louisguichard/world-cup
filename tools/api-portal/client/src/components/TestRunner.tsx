import { useState, useCallback } from "react";
import { testKey, ApiError, type TestResult } from "../api.js";

type RunnerState = "idle" | "running" | "success" | "failure";

type Props = {
  keyId: string;
  keyName: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  onDone?: (result: TestResult) => void;
};

export default function TestRunner({ keyId, keyName, endpoint, testMethod = "GET", onDone }: Props) {
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

  if (state === "idle") {
    return (
      <button className="btn btn-sm btn-ghost" onClick={() => void run()}>
        Test
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
            {result.ok ? "✓" : "✗"} {result.status > 0 ? `${result.status}` : "Error"}{" "}
            · {result.latencyMs}ms
          </div>
          {result.body && (
            <div className="test-runner-body">{result.body}</div>
          )}
        </>
      )}

      {error && <div className="test-runner-line failure">{error}</div>}

      <button
        className="btn btn-sm btn-ghost"
        style={{ marginTop: 8 }}
        onClick={() => void run()}
        disabled={state === "running"}
      >
        Re-test
      </button>
    </div>
  );
}
