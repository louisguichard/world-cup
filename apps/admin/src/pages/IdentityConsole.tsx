import { QuarantineQueue } from "../components/QuarantineQueue";
import { hasPermission, getCurrentRole } from "../lib/rbac";

export function IdentityConsole() {
  const role = getCurrentRole();
  const canResolve = hasPermission(role, "identity:resolve");

  return (
    <div className="admin-page">
      <h2>Identity Console</h2>
      <QuarantineQueue canResolve={canResolve} />
    </div>
  );
}
