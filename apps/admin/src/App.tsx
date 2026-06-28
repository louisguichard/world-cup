import { NavLink, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { IdentityConsole } from "./pages/IdentityConsole";
import { CorrectionsConsole } from "./pages/CorrectionsConsole";
import { ProviderHealthDashboard } from "./pages/ProviderHealthDashboard";
import { QualificationConsole } from "./pages/QualificationConsole";

export default function App() {
  return (
    <AdminShell>
      <nav className="admin-nav">
        <NavLink to="/identity">Identity</NavLink>
        <NavLink to="/corrections">Corrections</NavLink>
        <NavLink to="/providers">Providers</NavLink>
        <NavLink to="/qualification">Qualification</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<ProviderHealthDashboard />} />
        <Route path="/identity" element={<IdentityConsole />} />
        <Route path="/corrections" element={<CorrectionsConsole />} />
        <Route path="/providers" element={<ProviderHealthDashboard />} />
        <Route path="/qualification" element={<QualificationConsole />} />
      </Routes>
    </AdminShell>
  );
}
