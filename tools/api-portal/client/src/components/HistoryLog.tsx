import { useState, useEffect, useCallback } from "react";
import { getHistory, type VaultHistory } from "../api.js";

const PAGE_SIZE = 20;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryLog() {
  const [history, setHistory] = useState<VaultHistory[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { history: h } = await getHistory();
      setHistory(h);
    } catch {
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const pageItems = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="page-title">History</div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="empty-state">No history yet.</div>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Key</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((h) => (
                <tr key={h.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-faint)" }}>
                    {formatTime(h.timestamp)}
                  </td>
                  <td>
                    <span className={`action-badge ${h.action}`}>{h.action}</span>
                  </td>
                  <td>
                    {h.envVarName && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                        {h.envVarName}
                      </span>
                    )}
                    {h.label && h.envVarName !== h.label && (
                      <div style={{ color: "var(--text-faint)", fontSize: 11 }}>{h.label}</div>
                    )}
                    {!h.envVarName && h.label && (
                      <span style={{ fontSize: 12 }}>{h.label}</span>
                    )}
                  </td>
                  <td>
                    {h.meta && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{h.meta}</div>}
                    {(h.oldValueHash || h.newValueHash) && (
                      <div className="hash-change">
                        {h.oldValueHash?.slice(0, 8) ?? "—"}
                        {" → "}
                        {h.newValueHash?.slice(0, 8) ?? "—"}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span>Page {page + 1} of {totalPages}</span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
