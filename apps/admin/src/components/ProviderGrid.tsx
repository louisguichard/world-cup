interface ProviderRow {
  providerId: string;
  status: string;
  lastSuccessfulPoll: string | null;
  consecutiveErrors: number;
  circuitState: string;
}

interface Props {
  providers: ProviderRow[];
}

export function ProviderGrid({ providers }: Props) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Status</th>
          <th>Last poll</th>
          <th>Errors</th>
          <th>Circuit</th>
        </tr>
      </thead>
      <tbody>
        {providers.map((p) => (
          <tr key={p.providerId}>
            <td>{p.providerId}</td>
            <td>{p.status}</td>
            <td>{p.lastSuccessfulPoll ? new Date(p.lastSuccessfulPoll).toLocaleString() : "—"}</td>
            <td>{p.consecutiveErrors}</td>
            <td>{p.circuitState}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
