import { useState, useCallback, useEffect } from "react";
import { createKey, updateKey, ApiError, type ApiKey } from "../api.js";

type Props = {
  editKey?: ApiKey | null;
  existingGroups: string[];
  onSaved: (key: ApiKey) => void;
  onClose: () => void;
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
  if (!f.serviceGroup.trim()) errors.serviceGroup = "Required.";
  if (!f.label.trim()) errors.label = "Required.";
  if (!f.envVarName.trim()) {
    errors.envVarName = "Required.";
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(f.envVarName)) {
    errors.envVarName = "Must be uppercase with underscores only.";
  }
  if (!isEdit && !f.value.trim()) errors.value = "Required.";
  if (f.endpoint && f.endpoint.trim()) {
    try { new URL(f.endpoint); } catch { errors.endpoint = "Must be a valid URL."; }
  }
  return errors;
}
export default function AddEditDrawer({ editKey, existingGroups, onSaved, onClose }: Props) {
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
        if (!form.value.trim()) { setServerError("Value is required."); setLoading(false); return; }
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
          {isEdit ? "Edit Key" : "Add New Key"}
        </div>

        <div className="drawer-body">
          {serverError && <div className="error-banner">{serverError}</div>}

          <div className="field">
            <label>Service Group</label>
            <input
              list="group-list"
              value={form.serviceGroup}
              onChange={(e) => set("serviceGroup", e.target.value)}
              placeholder="e.g. ESPN API"
            />
            <datalist id="group-list">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
            {errors.serviceGroup && <div className="field-error">{errors.serviceGroup}</div>}
          </div>

          <div className="field">
            <label>Label</label>
            <input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. ESPN API Key"
            />
            {errors.label && <div className="field-error">{errors.label}</div>}
          </div>

          <div className="field">
            <label>Env Var Name</label>
            <input
              value={form.envVarName}
              onChange={(e) => handleEnvVarChange(e.target.value)}
              placeholder="e.g. VITE_ESPN_API_KEY"
              style={{ fontFamily: "var(--mono)", fontSize: 12 }}
            />
            <div className="field-hint">Auto-uppercased. Used in .env.local sync.</div>
            {errors.envVarName && <div className="field-error">{errors.envVarName}</div>}
          </div>

          <div className="field">
            <label>Value {isEdit && <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(leave blank to keep current)</span>}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type={showValue ? "text" : "password"}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder={isEdit ? "Enter new value to change" : "Paste API key"}
                style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12 }}
              />
              <button
                className="btn-icon"
                type="button"
                onClick={() => setShowValue((s) => !s)}
                title={showValue ? "Hide" : "Show"}
              >
                {showValue ? "🙈" : "👁"}
              </button>
            </div>
            {errors.value && <div className="field-error">{errors.value}</div>}
          </div>

          <div className="field">
            <label>Endpoint URL <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span></label>
            <input
              value={form.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
              placeholder="https://api.example.com/v1"
            />
            {errors.endpoint && <div className="field-error">{errors.endpoint}</div>}
          </div>

          <div className="field">
            <label>Test Method</label>
            <select value={form.testMethod} onChange={(e) => set("testMethod", e.target.value as "GET" | "POST")}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div className="field">
            <label>Test Headers <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span></label>
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
            <div className="field-hint">e.g. x-rapidapi-key / x-rapidapi-host</div>
          </div>

          <div className="field">
            <label>Notes <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Any notes about this key…"
            />
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {isEdit ? "Save Changes" : "Add Key"}
          </button>
        </div>
      </div>
    </>
  );
}
