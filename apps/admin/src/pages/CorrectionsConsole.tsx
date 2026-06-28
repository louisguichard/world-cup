import { CorrectionEventLog } from "../components/CorrectionEventLog";
import { ReplayControl } from "../components/ReplayControl";

export function CorrectionsConsole() {
  return (
    <div className="admin-page">
      <h2>Corrections Console</h2>
      <CorrectionEventLog />
      <ReplayControl />
    </div>
  );
}
