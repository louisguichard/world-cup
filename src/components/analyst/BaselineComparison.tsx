import { useState } from "react";

type Mode = "official" | "baseline";

export function BaselineComparison() {
  const [mode, setMode] = useState<Mode>("official");

  return (
    <fieldset className="baseline-comparison">
      <legend>Compare against</legend>
      <label>
        <input
          type="radio"
          name="baseline-mode"
          checked={mode === "official"}
          onChange={() => setMode("official")}
        />
        vs current official
      </label>
      <label>
        <input
          type="radio"
          name="baseline-mode"
          checked={mode === "baseline"}
          onChange={() => setMode("baseline")}
        />
        vs no-override scenario
      </label>
    </fieldset>
  );
}
