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

  it("maps halftime post state without marking full_time", () => {
    const fields = parseEspnClockFields({
      type: { state: "post", completed: false, detail: "Half Time" },
    });
    expect(fields.period).toBe("half_time");
    expect(fields.period).not.toBe("full_time");
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

  it("maps extra time second half when displayClock is 106'", () => {
    const fields = parseEspnClockFields({
      displayClock: "106'",
      period: 2,
      type: { state: "in", detail: "2nd Half" }
    });
    expect(fields.clockMinute).toBe(106);
    expect(fields.period).toBe("extra_time_second");
  });

  it("maps ESPN period 3 and 4 to extra time halves", () => {
    expect(
      parseEspnClockFields({
        displayClock: "92'",
        period: 3,
        type: { state: "in", detail: "2nd Half" }
      }).period
    ).toBe("extra_time_first");
    expect(
      parseEspnClockFields({
        displayClock: "108'",
        period: 4,
        type: { state: "in", detail: "2nd Half" }
      }).period
    ).toBe("extra_time_second");
  });
});
