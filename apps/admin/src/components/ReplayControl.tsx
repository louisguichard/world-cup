import { useState } from "react";

/** Read-only replay viewer — does not mutate canonical state */
export function ReplayControl() {
  const [asOf, setAsOf] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  function loadPreview() {
    if (!asOf) return;
    setPreview(`Canonical state preview at ${asOf} (read-only stub)`);
  }

  return (
    <section>
      <h3>Replay Control</h3>
      <label>
        Point in time
        <input type="datetime-local" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </label>
      <button type="button" onClick={loadPreview}>
        Preview state
      </button>
      {preview ? <pre className="admin-preview">{preview}</pre> : null}
    </section>
  );
}
