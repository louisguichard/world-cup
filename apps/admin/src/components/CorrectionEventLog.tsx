import { useEffect, useState } from "react";

type CorrectionEntry = {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  analystId: string;
  reason?: string;
  appliedAt: string;
};

export function CorrectionEventLog() {
  const [entries, setEntries] = useState<CorrectionEntry[]>([]);
  const [entityId, setEntityId] = useState("");

  useEffect(() => {
    if (!entityId) {
      setEntries([]);
      return;
    }
    void fetch(`/api/corrections?entityType=match&entityId=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [entityId]);

  return (
    <section>
      <h3>Correction Event Log</h3>
      <label>
        Filter by entity ID
        <input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
      </label>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Field</th>
            <th>Analyst</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>
                {e.entityType}:{e.entityId}
              </td>
              <td>{e.field}</td>
              <td>{e.analystId}</td>
              <td>{new Date(e.appliedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
