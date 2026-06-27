import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type RapidApiProvider = {
  id: string;
  label: string;
  host: string;
  marketplaceSlug: string;
  testPath: string;
  client: string;
  role: string;
};

const catalogPath = join(__dirname, "../../../config/rapidapi-catalog.json");

export function loadRapidApiCatalog(): RapidApiProvider[] {
  const raw = readFileSync(catalogPath, "utf8");
  return JSON.parse(raw) as RapidApiProvider[];
}

export function rapidApiMarketplaceUrl(slug: string): string {
  return `https://rapidapi.com/${slug}`;
}

export function rapidApiHeaders(key: string, host: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": host,
  };
}
