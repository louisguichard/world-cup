const DEFAULT_POLICIES = [
  { entityType: "match", field: "status", primary: "espn", backup: "wc-live" },
  { entityType: "match", field: "score.final", primary: "fifa", backup: "wc-live" },
  { entityType: "team", field: "fifaRanking", primary: "fifa", backup: "static-catalog" },
];

export function FieldAuthorityEditor() {
  return (
    <section>
      <h3>Field Authority Policy</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Field</th>
            <th>Primary</th>
            <th>Backup</th>
          </tr>
        </thead>
        <tbody>
          {DEFAULT_POLICIES.map((row) => (
            <tr key={`${row.entityType}.${row.field}`}>
              <td>{row.entityType}</td>
              <td>{row.field}</td>
              <td>{row.primary}</td>
              <td>{row.backup}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
