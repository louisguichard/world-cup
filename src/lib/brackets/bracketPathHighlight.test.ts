import { describe, expect, it } from "vitest";
import {
  collectBracketPathForMatch,
  collectForwardPathFromMatch,
  isConnectorSegmentHighlighted,
} from "./bracketPathHighlight";

describe("bracketPathHighlight", () => {
  it("collectForwardPathFromMatch follows M76 toward the Final", () => {
    const path = collectForwardPathFromMatch("M76");
    expect([...path].sort()).toEqual(["M101", "M104", "M76", "M90", "M97"]);
  });

  it("collectBracketPathForMatch includes upstream feeders for R16 slots", () => {
    const path = collectBracketPathForMatch("M90");
    expect(path.has("M75")).toBe(true);
    expect(path.has("M76")).toBe(true);
    expect(path.has("M104")).toBe(true);
  });

  it("isConnectorSegmentHighlighted requires both endpoints in path", () => {
    const path = collectForwardPathFromMatch("M76");
    expect(isConnectorSegmentHighlighted("M76", "M90", path)).toBe(true);
    expect(isConnectorSegmentHighlighted("M75", "M90", path)).toBe(false);
  });
});
