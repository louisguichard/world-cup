import { useCallback, useState } from "react";
import {
  autofillFormFromJsonEntry,
  parseJsonKeyBundle,
} from "../lib/parseJsonKeyBundle.js";
import { importJsonKeys, ApiError, type ApiKey } from "../api.js";

type FormAutofill = ReturnType<typeof autofillFormFromJsonEntry>;

type Props = {
  onAutofillOne: (data: FormAutofill) => void;
  onBulkImported: (keys: ApiKey[]) => void;
};

export function JsonKeyPastePanel({ onAutofillOne, onBulkImported }: Props) {
  const [jsonPaste, setJsonPaste] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseJsonKeyBundle> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleParse = useCallback(() => {
    setMessage(null);
    const result = parseJsonKeyBundle(jsonPaste);
    if (!result || (result.entries.length === 0 && result.warnings.length === 0)) {
      setParsed(null);
      setMessage({
        type: "err",
        text: 'Could not read JSON. Paste { "OpenAI": "sk-...", "VITE_RAPIDAPI_KEY": "..." } or use cURL paste for RapidAPI.',
      });
      return;
    }
    setParsed(result);
    if (result.entries.length === 0) {
      setMessage({ type: "warn", text: result.warnings[0] ?? "No keys found in JSON." });
      return;
    }
    setSelected(new Set(result.entries.map((e) => e.envVarName)));
    const skipNote = result.skipped.length ? ` Skipped ${result.skipped.length} empty.` : "";
    const warnNote = result.warnings.length ? ` ${result.warnings[0]}` : "";
    setMessage({
      type: result.warnings.length ? "warn" : "ok",
      text: `Found ${result.entries.length} key(s).${skipNote}${warnNote}`,
    });
  }, [jsonPaste]);

  const toggle = (envVarName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(envVarName)) next.delete(envVarName);
      else next.add(envVarName);
      return next;
    });
  };

  const handleAutofillFirst = () => {
    const first = parsed?.entries[0];
    if (!first) return;
    onAutofillOne(autofillFormFromJsonEntry(first));
    setMessage({ type: "ok", text: `Filled form with ${first.label}. Review and save.` });
  };

  const handleImportSelected = async () => {
    if (!parsed) return;
    const entries = parsed.entries.filter((e) => selected.has(e.envVarName));
    if (entries.length === 0) {
      setMessage({ type: "err", text: "Pick at least one key to import." });
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const { added, updated, keys } = await importJsonKeys(entries);
      onBulkImported(keys);
      setMessage({
        type: "ok",
        text: `Imported ${added + updated} key(s) to vault (${added} new, ${updated} updated).`,
      });
      setJsonPaste("");
      setParsed(null);
      setSelected(new Set());
    } catch (e) {
      setMessage({ type: "err", text: e instanceof ApiError ? e.message : "Import failed." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="curl-paste-panel">
      <div className="curl-paste-panel-head">
        <label htmlFor="json-paste">Paste JSON key bundle</label>
        <span className="curl-paste-hint">
          Provider JSON or env var names — for RapidAPI, use the cURL paste box instead
        </span>
      </div>
      <textarea
        id="json-paste"
        className="curl-paste-input"
        value={jsonPaste}
        onChange={(e) => {
          setJsonPaste(e.target.value);
          setParsed(null);
          setMessage(null);
        }}
        rows={5}
        placeholder={`{
  "OpenAI": "sk-...",
  "Anthropic": "sk-ant-...",
  "Google": "AIza...",
  "VITE_RAPIDAPI_KEY": "your-rapidapi-key"
}`}
        spellCheck={false}
      />
      <div className="curl-paste-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setJsonPaste("");
            setParsed(null);
            setMessage(null);
          }}
          disabled={!jsonPaste}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleParse}
          disabled={!jsonPaste.trim()}
        >
          Read JSON
        </button>
      </div>

      {parsed && parsed.entries.length > 0 ? (
        <div className="json-import-preview">
          <div className="json-import-preview-head">
            <span>{parsed.entries.length} keys ready</span>
            {parsed.entries.length === 1 ? (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleAutofillFirst}>
                  Fill this form
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={importing}
                  onClick={() => void handleImportSelected()}
                >
                  {importing ? <span className="spinner" /> : null}
                  Save to vault
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={importing || selected.size === 0}
                onClick={() => void handleImportSelected()}
              >
                {importing ? <span className="spinner" /> : null}
                Import {selected.size} to vault
              </button>
            )}
          </div>
          {parsed.entries.length > 1 ? (
            <div className="json-import-list">
              {parsed.entries.map((e) => (
                <label key={e.envVarName} className="mcp-endpoint-option">
                  <input
                    type="checkbox"
                    checked={selected.has(e.envVarName)}
                    onChange={() => toggle(e.envVarName)}
                  />
                  <span className="mcp-endpoint-option-text">
                    <strong>{e.label}</strong>
                    <code>{e.envVarName}</code>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {parsed.skipped.length > 0 ? (
            <div className="field-hint" style={{ marginTop: 8 }}>
              Skipped empty: {parsed.skipped.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className={`curl-paste-message curl-paste-message--${message.type}`}>{message.text}</div>
      ) : null}
    </div>
  );
}
