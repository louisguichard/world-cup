export function QualificationConsole() {
  return (
    <div className="admin-page">
      <h2>Qualification Engine</h2>
      <p>Engine version history and input hash audit (read-only).</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Snapshot count</th>
            <th>Last run</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2.0.0</td>
            <td>—</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
