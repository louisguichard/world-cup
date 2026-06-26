import { useState, useCallback, useEffect } from "react";
import { createKey, updateKey, ApiError, type ApiKey } from "../api.js";
import { autofillFromCurlSnippet } from "../lib/parseCurlSnippet.js";
import { JsonKeyPastePanel } from "./JsonKeyPastePanel.js";

type Props = {
  editKey?: ApiKey | null;
  existingGroups: string[];
  sharedEnvVarCount?: number;
  onSaved: (key: ApiKey) => void;
  onClose: () => void;
  onKeysImported?: (keys: ApiKey[]) => void;
};

type HeaderPair = { key: string; value: string };

type FormState = {
  serviceGroup: string;
  label: string;
  envVarName: string;
  value: string;
  endpoint: string;
  testMethod: "GET" | "POST";
  notes: string;
  headers: HeaderPair[];
};

function validateForm(f: FormState, isEdit: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.serviceGroup.trim()) errors.serviceGroup = "Please pick what kind of service this is.";
  if (!f.label.trim()) errors.label = "Please give this key a name.";
  if (!f.envVarName.trim()) {
    errors.envVarName = "Please enter the code name.";
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(f.envVarName)) {
    errors.envVarName = "Use only CAPITAL letters and underscores.";
  }
  if (!isEdit && !f.value.trim()) errors.value = "Please paste your secret key.";
  if (f.endpoint && f.endpoint.trim()) {
    try { new URL(f.endpoint); } catch { errors.endpoint = "That doesn't look like a real website address."; }
  }
  return errors;
}
export default function AddEditDrawer({ editKey, existingGroups, sharedEnvVarCount = 1, onSaved, onClose, onKeysImported }: Props) {
  const isEdit = !!editKey;

  const [form, setForm] = useState<FormState>({
    serviceGroup: editKey?.serviceGroup ?? "",
    label: editKey?.label ?? "",
    envVarName: editKey?.envVarName ?? "",
    value: "",
    endpoint: editKey?.endpoint ?? "",
    testMethod: editKey?.testMethod ?? "GET",
    notes: editKey?.notes ?? "",
    headers: Object.entries(editKey?.testHeaders ?? {}).map(([k, v]) => ({ key: k, value: v })),
  });

  const [showValue, setShowValue] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [curlPaste, setCurlPaste] = useState("");
  const [curlMessage, setCurlMessage] = useState<{ type: "ok" | "warn" | "err"; text: string } | null>(null);

  const handleCurlAutofill = useCallback(() => {
    setCurlMessage(null);
    const result = autofillFromCurlSnippet(curlPaste);
    if (!result) {
      setCurlMessage({
        type: "err",
        text: "Could not parse that snippet. Paste the full cURL block from RapidAPI (Code Snippets → cURL).",
      });
      return;
    }

    setForm((f) => ({
      ...f,
      serviceGroup: result.serviceGroup,
      label: result.label,
      envVarName: result.envVarName,
      value: result.value || f.value,
      endpoint: result.endpoint,
      testMethod: result.testMethod,
      notes: result.notes,
      headers: result.headers.length > 0 ? result.headers : f.headers,
    }));
    if (result.value) setShowValue(true);
    const warnText = result.warnings.join(" ");
    setCurlMessage({
      type: warnText ? "warn" : "ok",
      text: warnText
        ? `Partially filled. ${warnText}`
        : result.isRapidApi
          ? `Filled RapidAPI key for ${result.label}. Review fields, then save.`
          : "Fields filled from cURL. Review and save.",
    });
  }, [curlPaste]);

  useEffect(() => {
    if (editKey) {
      setForm({
        serviceGroup: editKey.serviceGroup,
        label: editKey.label,
        envVarName: editKey.envVarName,
        value: "",
        endpoint: editKey.endpoint ?? "",
        testMethod: editKey.testMethod ?? "GET",
        notes: editKey.notes ?? "",
        headers: Object.entries(editKey.testHeaders ?? {}).map(([k, v]) => ({ key: k, value: v })),
      });
    }
  }, [editKey]);

  const set = useCallback(<K extends keyof FormState>(field: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [field]: val }));
  }, []);

  const handleEnvVarChange = useCallback((v: string) => {
    set("envVarName", v.toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
  }, [set]);

  const handleSubmit = useCallback(async () => {
    const errs = validateForm(form, isEdit);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setServerError("");
    setLoading(true);

    const testHeaders = form.headers.reduce<Record<string, string>>((acc, h) => {
      if (h.key.trim()) acc[h.key.trim()] = h.value;
      return acc;
    }, {});

    const payload = {
      serviceGroup: form.serviceGroup,
      label: form.label,
      envVarName: form.envVarName,
      ...(form.value.trim() ? { value: form.value } : {}),
      endpoint: form.endpoint.trim() || undefined,
      testMethod: form.testMethod,
      notes: form.notes.trim() || undefined,
      testHeaders: Object.keys(testHeaders).length > 0 ? testHeaders : undefined,
    };

    try {
      let saved: ApiKey;
      if (isEdit && editKey) {
        const res = await updateKey(editKey.id, payload);
        saved = res.key;
      } else {
        if (!form.value.trim()) { setServerError("Please paste your secret key."); setLoading(false); return; }
        const res = await createKey({ ...payload, value: form.value });
        saved = res.key;
      }
      onSaved(saved);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, editKey, onSaved]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 16 }}>←</button>
          {isEdit ? "Paste or change my secret key" : "Add a new secret key"}
        </div>

        <div className="drawer-body">
          {serverError && <div className="error-banner">{serverError}</div>}

          <div className="secret-key-callout">
            <div className="secret-key-callout-title">⭐ Paste your secret API key here</div>
            <p className="secret-key-callout-hint">
              This is like a password. Get it from the service website (for RapidAPI: log in → My Apps →
              your app → <strong>Security</strong> → copy <strong>API Key</strong>).
              {sharedEnvVarCount > 1 && (
                <>
                  {" "}
                  <strong>Saving updates {sharedEnvVarCount} key slots</strong> that share this code name
                  ({editKey?.envVarName}) — all linked apps get the new value when you sync.
                </>
              )}
            </p>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="key-value">
                Your secret key {isEdit && <span className="label-optional">(leave blank to keep the old one)</span>}
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  id="key-value"
                  type={showValue ? "text" : "password"}
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder={isEdit ? "Paste a new key to replace the old one" : "Paste your secret API key here"}
                  style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 13 }}
                  autoFocus
                />
                <button
                  className="btn-icon"
                  type="button"
                  onClick={() => setShowValue((s) => !s)}
                  title={showValue ? "Hide key" : "Show key"}
                >
                  {showValue ? "🙈" : "👁"}
                </button>
              </div>
              {errors.value && <div className="field-error">{errors.value}</div>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="key-label">Friendly name</label>
            <input
              id="key-label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. My RapidAPI Key"
            />
            {errors.label && <div className="field-error">{errors.label}</div>}
          </div>

          <div className="field">
            <label htmlFor="key-env">Name your app uses in code</label>
            <input
              id="key-env"
              value={form.envVarName}
              onChange={(e) => handleEnvVarChange(e.target.value)}
              placeholder="e.g. VITE_RAPIDAPI_KEY"
              style={{ fontFamily: "var(--mono)", fontSize: 12 }}
            />
            <div className="field-hint">This gets written into your app&apos;s <code>.env.local</code> file when you sync.</div>
            {errors.envVarName && <div className="field-error">{errors.envVarName}</div>}
          </div>

          <details className="advanced-section" open>
            <summary>Paste JSON or cURL (shortcuts)</summary>

          <JsonKeyPastePanel
            onAutofillOne={(data) => {
              setForm((f) => ({
                ...f,
                serviceGroup: data.serviceGroup,
                label: data.label,
                envVarName: data.envVarName,
                value: data.value || f.value,
                endpoint: data.endpoint,
                testMethod: data.testMethod,
                notes: data.notes,
                headers: data.headers.length > 0 ? data.headers : f.headers,
              }));
              if (data.value) setShowValue(true);
              setCurlMessage({ type: "ok", text: `Filled from JSON: ${data.label}` });
            }}
            onBulkImported={(keys) => {
              onKeysImported?.(keys);
              setCurlMessage({ type: "ok", text: "Keys saved to vault." });
            }}
          />

          <div className="curl-paste-panel">
            <div className="curl-paste-panel-head">
              <label htmlFor="curl-paste">Paste from RapidAPI (optional shortcut)</label>
              <span className="curl-paste-hint">On RapidAPI: Code Snippets → cURL — copy and paste here</span>
            </div>
            <textarea
              id="curl-paste"
              className="curl-paste-input"
              value={curlPaste}
              onChange={(e) => {
                setCurlPaste(e.target.value);
                setCurlMessage(null);
              }}
              rows={4}
              placeholder={`curl --request GET \\
  --url https://sports-odds-intelligence-api.p.rapidapi.com/futures/ \\
  --header 'x-rapidapi-host: sports-odds-intelligence-api.p.rapidapi.com' \\
  --header 'x-rapidapi-key: YOUR_KEY_HERE'`}
              spellCheck={false}
            />
            <div className="curl-paste-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setCurlPaste("");
                  setCurlMessage(null);
                }}
                disabled={!curlPaste}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCurlAutofill}
                disabled={!curlPaste.trim()}
              >
                Autofill from paste
              </button>
            </div>
            {curlMessage ? (
              <div className={`curl-paste-message curl-paste-message--${curlMessage.type}`}>
                {curlMessage.text}
              </div>
            ) : null}
          </div>
          </details>

          <details className="advanced-section">
            <summary>Optional: test settings and notes</summary>

          <div className="field">
            <label>What kind of service?</label>
            <input
              list="group-list"
              value={form.serviceGroup}
              onChange={(e) => set("serviceGroup", e.target.value)}
              placeholder="e.g. RapidAPI"
            />
            <datalist id="group-list">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
            {errors.serviceGroup && <div className="field-error">{errors.serviceGroup}</div>}
          </div>

          <div className="field">
            <label>Test website <span className="label-optional">(optional)</span></label>
            <input
              value={form.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
              placeholder="https://api.example.com/v1"
            />
            <div className="field-hint">Used when you click “Check if it works”.</div>
            {errors.endpoint && <div className="field-error">{errors.endpoint}</div>}
          </div>

          <div className="field">
            <label>How to test</label>
            <select value={form.testMethod} onChange={(e) => set("testMethod", e.target.value as "GET" | "POST")}>
              <option value="GET">GET (just open the link)</option>
              <option value="POST">POST (send data)</option>
            </select>
          </div>

          <div className="field">
            <label>Extra test info <span className="label-optional">(optional)</span></label>
            <div className="headers-editor">
              {form.headers.map((h, i) => (
                <div key={i} className="header-row">
                  <input
                    value={h.key}
                    onChange={(e) => {
                      const updated = [...form.headers];
                      updated[i] = { ...updated[i], key: e.target.value };
                      set("headers", updated);
                    }}
                    placeholder="Header name"
                  />
                  <input
                    value={h.value}
                    onChange={(e) => {
                      const updated = [...form.headers];
                      updated[i] = { ...updated[i], value: e.target.value };
                      set("headers", updated);
                    }}
                    placeholder="Value"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => set("headers", form.headers.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={() => set("headers", [...form.headers, { key: "", value: "" }])}
              >
                + Add header
              </button>
            </div>
            <div className="field-hint">For RapidAPI: usually <code>x-rapidapi-host</code> is already set.</div>
          </div>

          <div className="field">
            <label>Notes <span className="label-optional">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Anything you want to remember about this key…"
            />
          </div>
          </details>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {isEdit ? "Save my key" : "Add my key"}
          </button>
        </div>
      </div>
    </>
  );
}
