import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function AdminShell({ children }: Props) {
  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <h1>WC2026 Admin</h1>
        <span className="admin-shell__badge">Slate console</span>
      </header>
      <main className="admin-shell__main">{children}</main>
    </div>
  );
}
