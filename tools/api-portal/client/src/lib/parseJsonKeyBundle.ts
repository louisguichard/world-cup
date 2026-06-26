const PLACEHOLDERS = new Set(["FILL_ME_IN", "", "your_key_here", "your-key-here", "your_rapidapi_key_here"]);

function isEmptyValue(value: string): boolean {
  const v = value.trim();
  return PLACEHOLDERS.has(v) || v.startsWith("your_");
}

export type JsonKeyEntry = {
  envVarName: string;
  label: string;
  serviceGroup: string;
  value: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  testHeaders?: Record<string, string>;
  notes?: string;
};

export type JsonKeyBundleResult = {
  entries: JsonKeyEntry[];
  skipped: string[];
  warnings: string[];
};

/** Friendly provider name → standard env var (AnythingLLM-style bundles). */
const PROVIDER_ENV_MAP: Record<string, { envVarName: string; label: string; serviceGroup: string }> = {
  Anthropic: { envVarName: "ANTHROPIC_API_KEY", label: "Anthropic API Key", serviceGroup: "AI Providers" },
  OpenAI: { envVarName: "OPENAI_API_KEY", label: "OpenAI API Key", serviceGroup: "AI Providers" },
  Google: { envVarName: "GEMINI_API_KEY", label: "Google Gemini API Key", serviceGroup: "AI Providers" },
  Groq: { envVarName: "GROQ_API_KEY", label: "Groq API Key", serviceGroup: "AI Providers" },
  HuggingFace: { envVarName: "HUGGINGFACE_API_KEY", label: "Hugging Face API Key", serviceGroup: "AI Providers" },
  OpenRouter: { envVarName: "OPENROUTER_API_KEY", label: "OpenRouter API Key", serviceGroup: "AI Providers" },
  Deepseek: { envVarName: "DEEPSEEK_API_KEY", label: "Deepseek API Key", serviceGroup: "AI Providers" },
  Mistral: { envVarName: "MISTRAL_API_KEY", label: "Mistral API Key", serviceGroup: "AI Providers" },
  OpenAILike: { envVarName: "OPENAI_LIKE_API_KEY", label: "OpenAI-Compatible API Key", serviceGroup: "AI Providers" },
  Together: { envVarName: "TOGETHER_API_KEY", label: "Together API Key", serviceGroup: "AI Providers" },
  xAI: { envVarName: "XAI_API_KEY", label: "xAI API Key", serviceGroup: "AI Providers" },
  Perplexity: { envVarName: "PERPLEXITY_API_KEY", label: "Perplexity API Key", serviceGroup: "AI Providers" },
  Moonshot: { envVarName: "MOONSHOT_API_KEY", label: "Moonshot (Kimi) API Key", serviceGroup: "AI Providers" },
  Cohere: { envVarName: "COHERE_API_KEY", label: "Cohere API Key", serviceGroup: "AI Providers" },
  AzureOpenAI: { envVarName: "AZURE_OPENAI_API_KEY", label: "Azure OpenAI API Key", serviceGroup: "AI Providers" },
  Jooble: { envVarName: "JOOBLE_API_KEY", label: "Jooble API Key", serviceGroup: "Job APIs" },
  FindWork: { envVarName: "FINDWORK_API_KEY", label: "Find Work API Key", serviceGroup: "Job APIs" },
};

const DEFAULT_ENDPOINTS: Record<string, { endpoint: string; testMethod: "GET" | "POST"; testHeaders?: Record<string, string> }> = {
  ANTHROPIC_API_KEY: {
    endpoint: "https://api.anthropic.com/v1/models",
    testMethod: "GET",
    testHeaders: { "x-api-key": "PLACEHOLDER", "anthropic-version": "2023-06-01" },
  },
  OPENAI_API_KEY: {
    endpoint: "https://api.openai.com/v1/models",
    testMethod: "GET",
  },
  GEMINI_API_KEY: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    testMethod: "GET",
  },
  MOONSHOT_API_KEY: {
    endpoint: "https://api.moonshot.ai/v1/models",
    testMethod: "GET",
  },
  GROQ_API_KEY: {
    endpoint: "https://api.groq.com/openai/v1/models",
    testMethod: "GET",
  },
  VITE_RAPIDAPI_KEY: {
    endpoint:
      "https://free-api-live-football-data.p.rapidapi.com/football-get-matches-by-date?date=20260626",
    testMethod: "GET",
    testHeaders: { "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com" },
  },
};

function stripJsonFences(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function resolveField(key: string): { envVarName: string; label: string; serviceGroup: string } {
  if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
    const base = key.replace(/_API_KEY$/, "").replace(/_/g, " ");
    return {
      envVarName: key,
      label: `${base} API Key`,
      serviceGroup: "Imported",
    };
  }
  const mapped = PROVIDER_ENV_MAP[key];
  if (mapped) return mapped;
  const envVarName = `${key.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}_API_KEY`;
  return { envVarName, label: `${key} API Key`, serviceGroup: "Imported" };
}

/** Parse a pasted JSON object of provider → API key values. */
export function parseJsonKeyBundle(raw: string): JsonKeyBundleResult | null {
  const warnings: string[] = [];
  const skipped: string[] = [];
  const entries: JsonKeyEntry[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(raw));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;

  if (record.mcpServers) {
    return {
      entries: [],
      skipped: ["mcpServers block"],
      warnings: ["MCP server config is for Cursor, not this vault. Paste the RapidAPI cURL snippet instead to add VITE_RAPIDAPI_KEY."],
    };
  }

  for (const [key, val] of Object.entries(record)) {
    if (key.startsWith("_")) continue;
    if (typeof val !== "string") {
      skipped.push(`${key} (not a string)`);
      continue;
    }
    if (isEmptyValue(val)) {
      skipped.push(`${key} (empty)`);
      continue;
    }

    const meta = resolveField(key);
    const defaults = DEFAULT_ENDPOINTS[meta.envVarName];
    const entry: JsonKeyEntry = {
      ...meta,
      value: val,
      notes: `Imported from JSON paste (${key}).`,
    };

    if (defaults) {
      entry.endpoint = defaults.endpoint;
      entry.testMethod = defaults.testMethod;
      if (defaults.testHeaders) {
        entry.testHeaders = Object.fromEntries(
          Object.entries(defaults.testHeaders).map(([h, v]) => [
            h,
            v === "PLACEHOLDER" ? val : v,
          ])
        );
      }
    }

    entries.push(entry);
  }

  if (entries.length === 0 && skipped.length === 0) {
    return null;
  }

  const dupes = new Set<string>();
  for (const e of entries) {
    if (dupes.has(e.envVarName)) {
      warnings.push(`Duplicate env var ${e.envVarName} — last value wins on import.`);
    }
    dupes.add(e.envVarName);
  }

  return { entries, skipped, warnings };
}

/** Fill the single-key drawer form from the first entry in a bundle. */
export function autofillFormFromJsonEntry(entry: JsonKeyEntry) {
  return {
    serviceGroup: entry.serviceGroup,
    label: entry.label,
    envVarName: entry.envVarName,
    value: entry.value,
    endpoint: entry.endpoint ?? "",
    testMethod: entry.testMethod ?? ("GET" as const),
    notes: entry.notes ?? "",
    headers: Object.entries(entry.testHeaders ?? {}).map(([k, v]) => ({ key: k, value: v })),
  };
}
