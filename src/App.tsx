import { AppShell } from "./components/layout/AppShell";
import { SSEProvider } from "./components/providers/SSEProvider";

export default function App() {
  return (
    <SSEProvider>
      <AppShell />
    </SSEProvider>
  );
}
