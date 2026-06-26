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
    if (!parsed.search) {
      parsed.searchParams.set("apiKey", key.value);
      url = parsed.toString();
    }
  } catch {
    // Not a valid URL — will fail below
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${key.value}`,
    "Accept": "application/json",
    ...(key.testHeaders ?? {}),
  };

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
