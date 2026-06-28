import { describe, expect, it } from "vitest";
import { createOfficialSlice, fromQualificationStatus } from "../../store/slices/officialSlice";
import { createPredictionSlice } from "../../store/slices/predictionSlice";
import { createScenarioSlice } from "../../store/slices/scenarioSlice";

describe("Analyst Zustand slices", () => {
  it("official and prediction slices remain independent", () => {
    let official = createOfficialSlice((fn) => {
      official = { ...official, ...fn(official) };
    });
    let prediction = createPredictionSlice((fn) => {
      prediction = { ...prediction, ...fn(prediction) };
    });

    official.applyQualificationChange(
      fromQualificationStatus("mex", "A", {
        status: "projected",
        certainty: "likely",
        lifeState: "alive",
        canQualify: true,
        projectionScore: 72,
      })
    );

    prediction.applyPredictionUpdate({
      teamId: "mex",
      stage: "ROUND_OF_32",
      probability: 0.67,
      modelVersion: "1.0",
      updatedAt: Date.now(),
    });

    expect(official.qualification.mex?.tier).toBe("projected");
    expect(prediction.advancementProbabilities["mex:ROUND_OF_32"]?.probability).toBe(0.67);
    expect(Object.keys(prediction.advancementProbabilities)).not.toContain("tier");
  });

  it("scenario slice is not mutated by official base-changed marker alone", () => {
    let scenario = createScenarioSlice((fn) => {
      scenario = { ...scenario, ...fn(scenario) };
    });
    let official = createOfficialSlice((fn) => {
      official = { ...official, ...fn(official) };
    });

    scenario.setActiveScenario("sc-1", "snap-1");
    scenario.addOverride({ matchId: "m1", homeScore: 2, awayScore: 1 });
    official.markEntityUpdated("m1");

    expect(scenario.overrides).toHaveLength(1);
    expect(official.baseChangedAt).not.toBeNull();
    expect(scenario.activeScenarioId).toBe("sc-1");
  });
});
