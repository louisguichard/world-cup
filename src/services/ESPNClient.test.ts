import { describe, expect, it } from "vitest";
import { parseEspnClockFields } from "./ESPNClient";

describe("parseEspnClockFields", () => {
  it("parses displayClock with stoppage time", () => {
    const fields = parseEspnClockFields({
      displayClock: "45'+2",
      period: 1,
      type: { state: "in", detail: "1st Half" }
    });
    expect(fields.clockMinute).toBe(45);
    expect(fields.clockExtra).toBe(2);
    expect(fields.period).toBe("first_half");
    expect(fields.clockRunning).toBe(true);
  });

  it("maps completed matches to full_time", () => {
    const fields = parseEspnClockFields({
      type: { state: "post", completed: true, detail: "Full Time" }
    });
    expect(fields.period).toBe("full_time");
    expect(fields.clockRunning).toBe(false);
  });

  it("derives minute from clock seconds when displayClock missing", () => {
    const fields = parseEspnClockFields({
      clock: 4020,
      period: 2,
      type: { state: "in", detail: "2nd Half" }
    });
    expect(fields.clockMinute).toBe(67);
    expect(fields.period).toBe("second_half");
  });
});
