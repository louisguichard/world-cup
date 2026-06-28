import { useEffect, useState } from "react";

type QuarantineItem = {
  id: string;
  externalId: string;
  entityType: string;
  providerId: string;
  topScore: number;
  reason: string;
  candidateIds: string[];
};

interface Props {
  canResolve: boolean;
}

export function QuarantineQueue({ canResolve }: Props) {
  const [items, setItems] = useState<QuarantineItem[]>([]);

  useEffect(() => {
    void fetch("/api/identity/quarantine")
      .then((r) => r.json())
      .then((data: { items: QuarantineItem[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  async function resolve(id: string, resolution: "APPROVED" | "REJECTED") {
    if (!canResolve) return;
    await fetch(`/api/identity/quarantine?aliasId=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, resolvedBy: "admin-local", canonicalId: null }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>External ID</th>
          <th>Provider</th>
          <th>Score</th>
          <th>Reason</th>
          {canResolve ? <th>Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.externalId}</td>
            <td>{item.providerId}</td>
            <td>{item.topScore.toFixed(2)}</td>
            <td>{item.reason}</td>
            {canResolve ? (
              <td>
                <button type="button" onClick={() => void resolve(item.id, "APPROVED")}>
                  Confirm
                </button>
                <button type="button" onClick={() => void resolve(item.id, "REJECTED")}>
                  Reject
                </button>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
