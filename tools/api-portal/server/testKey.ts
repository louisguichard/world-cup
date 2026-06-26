import type { ApiKey } from "./vault.js";

export type TestResult = {
  status: number;
  latencyMs: number;
  ok: boolean;
  body?: string;
};

export async function testApiKey(key: ApiKey): Promise<TestResult> {
  if (!key.endpoint) {
    return { status: 0, latencyMs: 0, ok: false, body: "No endpoint configured." };
  }

  const method = key.testMethod ?? "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  // Build URL — append ?apiKey= only if no existing query string
  let url = key.endpoint;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("googleapis.com")) {
      parsed.searchParams.set("key", key.value);
      url = parsed.toString();
    } else if (!parsed.search) {
      parsed.searchParams.set("apiKey", key.value);
      url = parsed.toString();
    }
  } catch {
    // Not a valid URL — will fail below
  }

  const testHeaders = { ...(key.testHeaders ?? {}) };
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...testHeaders,
  };

  if (testHeaders["x-rapidapi-host"]) {
    headers["x-rapidapi-key"] = key.value;
  } else if ("x-api-key" in testHeaders || "X-API-Key" in testHeaders) {
    const apiKeyHeader = testHeaders["x-api-key"] !== undefined ? "x-api-key" : "X-API-Key";
    headers[apiKeyHeader] = key.value;
  } else if (testHeaders["X-API-Key"] === "FILL_ME_IN" || testHeaders["x-api-key"] === "FILL_ME_IN") {
    const apiKeyHeader = testHeaders["X-API-Key"] !== undefined ? "X-API-Key" : "x-api-key";
    headers[apiKeyHeader] = key.value;
  } else if (!headers.Authorization && !headers["x-rapidapi-key"] && !headers["X-API-Key"] && !headers["x-api-key"]) {
    headers.Authorization = `Bearer ${key.value}`;
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      redirect: "manual",
    });
    const latencyMs = Date.now() - start;
    const text = await res.text().catch(() => "");
    return {
      status: res.status,
      latencyMs,
      ok: res.ok,
      body: text.slice(0, 500),
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out after 5s"
          : err.message
        : "Unknown error";
    return { status: 0, latencyMs, ok: false, body: msg };
  } finally {
    clearTimeout(timer);
  }
}
