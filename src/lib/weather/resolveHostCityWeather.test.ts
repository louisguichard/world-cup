import { describe, expect, it } from "vitest";
import { lookupHostCityWeatherHint } from "../../data/venues/hostCityWeatherCatalog";
import { resolveHostCityWeather } from "./resolveHostCityWeather";

describe("resolveHostCityWeather", () => {
  it("maps stadium names to canonical host cities", () => {
    const hit = resolveHostCityWeather({ venueString: "Mercedes-Benz Stadium" });
    expect(hit?.id).toBe("atlanta");
    expect(hit?.yahooLocation).toBe("atlanta");
  });

  it("maps metro aliases to host cities", () => {
    expect(lookupHostCityWeatherHint("East Rutherford")?.id).toBe("new-york-new-jersey");
    expect(lookupHostCityWeatherHint("Foxborough")?.id).toBe("boston");
    expect(lookupHostCityWeatherHint("Inglewood")?.id).toBe("los-angeles");
    expect(lookupHostCityWeatherHint("Guadalupe")?.id).toBe("monterrey");
  });

  it("resolves broadcast schedule cities", () => {
    expect(resolveHostCityWeather({ cityHint: "Mexico City" })?.id).toBe("mexico-city");
    expect(resolveHostCityWeather({ cityHint: "Vancouver" })?.id).toBe("vancouver");
  });
});
