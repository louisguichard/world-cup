import { useEffect, useState } from "react";
import { ProviderGrid } from "../components/ProviderGrid";
import { FieldAuthorityEditor } from "../components/FieldAuthorityEditor";

type HealthResponse = {
  status: string;
  providers: Array<{
    providerId: string;
    status: string;
    lastSuccessfulPoll: string | null;
    consecutiveErrors: number;
    circuitState: string;
  }>;
  quarantineDepth: number;
};

export function ProviderHealthDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="admin-page">
      <h2>Provider Health</h2>
      {health ? (
        <>
          <p>System: {health.status} · Quarantine depth: {health.quarantineDepth}</p>
          <ProviderGrid providers={health.providers} />
        </>
      ) : (
        <p>Health API unavailable (local dev).</p>
      )}
      <FieldAuthorityEditor />
    </div>
  );
}
