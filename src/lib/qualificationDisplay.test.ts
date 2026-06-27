import { describe, expect, it } from "vitest";
import { APP_COPY } from "./appCopy";
import { resolveQualificationDisplay } from "./qualificationDisplay";
import type { QualificationStatus } from "../types";

function qual(partial: Partial<QualificationStatus> & Pick<QualificationStatus, "status">): QualificationStatus {
  return {
    certainty: "projected_weak",
    lifeState: "alive",
    canQualify: true,
    projectionScore: 50,
    reason: "test",
    ...partial,
  };
}

describe("resolveQualificationDisplay", () => {
  it("labels confirmed top-two as locked in · moving on", () => {
    const d = resolveQualificationDisplay(
      qual({ status: "qualified", certainty: "confirmed", lifeState: "projected", projectionScore: 100 })
    );
    expect(d.variant).toBe("confirmed-qualified");
    expect(d.label).toBe(APP_COPY.qual.confirmedQualified);
  });

  it("labels projected top-two as probably · moving on", () => {
    const d = resolveQualificationDisplay(
      qual({ status: "qualified", certainty: "projected_weak", lifeState: "alive" })
    );
    expect(d.variant).toBe("projected-qualified");
    expect(d.shortLabel).toBe(APP_COPY.qual.projectedQualifiedShort);
  });

  it("labels mathematical elimination as locked in · out", () => {
    const d = resolveQualificationDisplay(
      qual({
        status: "eliminated",
        certainty: "confirmed",
        canQualify: false,
        lifeState: "eliminated",
        projectionScore: 0,
      })
    );
    expect(d.variant).toBe("confirmed-eliminated");
    expect(d.label).toBe(APP_COPY.qual.confirmedEliminated);
  });

  it("labels fourth-place alive as probably · out", () => {
    const d = resolveQualificationDisplay(
      qual({ status: "pending", lifeState: "alive", canQualify: true, projectionScore: 22 })
    );
    expect(d.variant).toBe("projected-eliminated");
    expect(d.label).toBe(APP_COPY.qual.projectedEliminated);
  });

  it("labels third-place race as still in it", () => {
    const d = resolveQualificationDisplay(
      qual({ status: "at_risk", certainty: "projected_weak", lifeState: "alive" })
    );
    expect(d.variant).toBe("in-contention");
    expect(d.shortLabel).toBe(APP_COPY.qual.inContentionShort);
  });
});
