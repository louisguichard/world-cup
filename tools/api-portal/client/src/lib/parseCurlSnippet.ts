export type HeaderPair = { key: string; value: string };

export type ParsedCurl = {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
};

export type CurlAutofill = {
  serviceGroup: string;
  label: string;
  envVarName: string;
  value: string;
  endpoint: string;
  testMethod: "GET" | "POST";
  headers: HeaderPair[];
  notes: string;
  warnings: string[];
  isRapidApi: boolean;
};

const RAPIDAPI_HOST_LABELS: Record<string, string> = {
  "sports-odds-intelligence-api.p.rapidapi.com": "Sports Odds Intelligence",
  "sportapi7.p.rapidapi.com": "SportAPI7",
  "free-api-live-football-data.p.rapidapi.com": "Football Data API",
  "world-cup-2026.p.rapidapi.com": "World Cup 2026 Teams",
  "world-cup-2026-live-api.p.rapidapi.com": "WC 2026 Live API",
  "open-weather13.p.rapidapi.com": "Open Weather 13",
  "fotmob.p.rapidapi.com": "FotMob",
  "sofascore6.p.rapidapi.com": "SofaScore",
  "zafronix-fifa-world-cup-api.p.rapidapi.com": "Zafronix FIFA World Cup",
};

const SENSITIVE_HEADER_KEYS = new Set([
  "x-rapidapi-key",
  "authorization",
  "x-api-key",
  "api-key",
]);

/** Strip RapidAPI playground chrome and normalize a pasted snippet. */
function extractCurlText(raw: string): string {
  const trimmed = raw.trim();
  const curlIdx = trimmed.search(/\bcurl\b/i);
  const body = curlIdx >= 0 ? trimmed.slice(curlIdx) : trimmed;

  return body
    .replace(/\\\s*[\r\n]+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMethod(curl: string): "GET" | "POST" {
  const match = curl.match(/(?:--request|-X)\s+([A-Za-z]+)/i);
  const method = (match?.[1] ?? "GET").toUpperCase();
  return method === "POST" ? "POST" : "GET";
}

function parseUrl(curl: string): string | null {
  const flagMatch = curl.match(/--url\s+(['"]?)([^\s'"\\]+)\1?/i);
  if (flagMatch?.[2]) return cleanUrl(flagMatch[2]);

  const bareMatch = curl.match(/\b(https?:\/\/[^\s'"\\]+)/i);
  return bareMatch?.[1] ? cleanUrl(bareMatch[1]) : null;
}

function cleanUrl(url: string): string {
  return url.replace(/\\+$/g, "").replace(/[),;]+$/g, "").trim();
}

function parseHeaders(curl: string): Record<string, string> {
  const headers: Record<string, string> = {};

  const patterns = [
    /--header\s+(['"])(.*?)\1/gi,
    /-H\s+(['"])(.*?)\1/gi,
    /--header\s+([^\s]+:[^\s]+(?:\s+[^\s-][^\s]*)*)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of curl.matchAll(pattern)) {
      const raw = (match[2] ?? match[1] ?? "").trim();
      const colon = raw.indexOf(":");
      if (colon <= 0) continue;
      const key = raw.slice(0, colon).trim();
      const value = raw.slice(colon + 1).trim().replace(/[),;('"\\]+$/g, "");
      if (key) headers[key.toLowerCase()] = value;
    }
  }

  // RapidAPI playground sometimes breaks quoting — scan for known header prefixes.
  const loose = [
    /x-rapidapi-host:\s*([a-z0-9.-]+)/i,
    /x-rapidapi-key:\s*([a-zA-Z0-9_-]+)/i,
    /content-type:\s*([^'")\s]+)/i,
  ];
  for (const re of loose) {
    const m = curl.match(re);
    if (!m) continue;
    const key = re.source.includes("host")
      ? "x-rapidapi-host"
      : re.source.includes("key")
        ? "x-rapidapi-key"
        : "content-type";
    if (!headers[key]) headers[key] = m[1];
  }

  return headers;
}

export function parseCurlSnippet(raw: string): ParsedCurl | null {
  const curl = extractCurlText(raw);
  if (!curl.toLowerCase().includes("curl")) return null;

  const url = parseUrl(curl);
  if (!url) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  return {
    method: parseMethod(curl),
    url,
    headers: parseHeaders(curl),
  };
}

function labelFromRapidApiHost(host: string): string {
  if (RAPIDAPI_HOST_LABELS[host]) return RAPIDAPI_HOST_LABELS[host];
  const slug = host.replace(/\.p\.rapidapi\.com$/i, "");
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Map a parsed cURL snippet to vault key form fields. */
export function autofillFromCurlSnippet(raw: string): CurlAutofill | null {
  const parsed = parseCurlSnippet(raw);
  if (!parsed) return null;

  const warnings: string[] = [];
  const host =
    parsed.headers["x-rapidapi-host"] ?? hostFromUrl(parsed.url) ?? "";
  const isRapidApi = host.endsWith(".rapidapi.com") || Boolean(parsed.headers["x-rapidapi-key"]);

  let value = "";
  let envVarName = "VITE_API_KEY";
  let serviceGroup = "API";
  let label = "API Key";
  let notes = `Imported from cURL snippet.\nEndpoint: ${parsed.url}`;

  const headerPairs: HeaderPair[] = [];

  if (isRapidApi) {
    value =
      parsed.headers["x-rapidapi-key"] ??
      parsed.headers["authorization"]?.replace(/^bearer\s+/i, "") ??
      "";
    if (!value) {
      warnings.push("No x-rapidapi-key found — paste the full playground snippet or enter the key manually.");
    }

    envVarName = "VITE_RAPIDAPI_KEY";
    serviceGroup = "RapidAPI";
    label = host ? labelFromRapidApiHost(host) : "RapidAPI Key";
    notes = `Imported from RapidAPI playground.\nHost: ${host || "unknown"}\nTest URL: ${parsed.url}`;

    if (host) {
      headerPairs.push({ key: "x-rapidapi-host", value: host });
    }
    for (const [key, val] of Object.entries(parsed.headers)) {
      if (SENSITIVE_HEADER_KEYS.has(key)) continue;
      if (key === "x-rapidapi-host") continue;
      headerPairs.push({ key, value: val });
    }
  } else {
    const auth = parsed.headers["authorization"];
    if (auth?.toLowerCase().startsWith("bearer ")) {
      value = auth.slice(7).trim();
      serviceGroup = "API";
      label = host ? `${host} API Key` : "API Key";
      envVarName = host
        ? `VITE_${host.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase()}_KEY`
        : "VITE_API_KEY";
    } else if (parsed.headers["x-api-key"]) {
      value = parsed.headers["x-api-key"];
      serviceGroup = "API";
      label = host ? `${host} API Key` : "API Key";
      envVarName = "VITE_API_KEY";
      headerPairs.push({ key: "X-API-Key", value: "FILL_ME_IN" });
    } else {
      warnings.push("No API key header detected — enter the key value manually.");
    }

    for (const [key, val] of Object.entries(parsed.headers)) {
      if (SENSITIVE_HEADER_KEYS.has(key)) continue;
      headerPairs.push({ key, value: val });
    }
  }

  return {
    serviceGroup,
    label,
    envVarName,
    value,
    endpoint: parsed.url,
    testMethod: parsed.method,
    headers: headerPairs,
    notes,
    warnings,
    isRapidApi,
  };
}
