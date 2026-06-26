import { useState, useCallback } from "react";
import { exportVault, importVault, resetVault, ApiError, type StatusResponse } from "../api.js";

type Props = {
  status: StatusResponse;
  onReset: () => void;
};

export default function Settings({ status, onReset }: Props) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExport = useCallback(() => {
    if (!confirm("Export vault as plaintext JSON? Store this file securely and delete it after.")) return;
    void exportVault();
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportError("");
      setImportSuccess(false);
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        await importVault(data);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (e) {
        setImportError(e instanceof ApiError ? e.message : "Import failed.");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }, []);

  const handleReset = useCallback(async () => {
    setResetting(true);
    setResetError("");
    try {
      await resetVault();
      setResetConfirmOpen(false);
      onReset();
    } catch (e) {
      setResetError(e instanceof ApiError ? e.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }, [onReset]);

  return (
    <div>
      <div className="page-title">Settings</div>

      <div className="settings-section">
        <h3>Keychain Status</h3>
        <div className="settings-row">
          <span className="label">Keychain (keytar)</span>
          <span className={status.keychainAvailable ? "status-ok" : "status-warn"}>
            {status.keychainAvailable ? "✓ Available" : "⚠ Unavailable (session mode)"}
          </span>
        </div>
        <div className="settings-row">
          <span className="label">Master key stored</span>
          <span className={status.keychainSetup ? "status-ok" : "status-warn"}>
            {status.keychainSetup
              ? status.keychainAvailable
                ? "✓ Stored in OS Keychain"
                : "✓ Active (session)"
              : "⚠ Not set up"}
          </span>
        </div>
        {!status.keychainAvailable && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-faint)" }}>
            Keytar native bindings unavailable. Run{" "}
            <code style={{ fontFamily: "var(--mono)" }}>xcode-select --install</code> then{" "}
            <code style={{ fontFamily: "var(--mono)" }}>npm rebuild keytar</code> in tools/api-portal/.
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Vault</h3>
        <div className="settings-row">
          <span className="label">Vault file</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)" }}>
            tools/api-portal/.portal-keys.enc
          </span>
        </div>
        <div className="settings-row">
          <span className="label">Vault exists</span>
          <span className={status.vaultExists ? "status-ok" : "status-warn"}>
            {status.vaultExists ? "✓ Yes" : "Not created yet"}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Export / Import</h3>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
          Export decrypts all keys to plaintext JSON. Store the file securely and delete it after use.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            Export Vault as JSON
          </button>
          <button className="btn btn-ghost" disabled={importing} onClick={handleImport}>
            {importing ? <span className="spinner" /> : "Import from JSON"}
          </button>
        </div>
        {importError && <div className="error-banner" style={{ marginTop: 10 }}>{importError}</div>}
        {importSuccess && (
          <div style={{ marginTop: 10, color: "var(--green)", fontSize: 12 }}>
            ✓ Import successful. Vault re-encrypted with current master key.
          </div>
        )}
      </div>

      <div className="settings-section" style={{ borderColor: "rgba(240,82,82,0.3)" }}>
        <h3 style={{ color: "var(--red)" }}>Danger Zone</h3>
        <div className="settings-row">
          <span className="label">Delete vault and keychain entry</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setResetConfirmOpen(true)}
          >
            Reset Vault
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
          This permanently deletes the encrypted vault file and removes the master key from your
          OS keychain. All stored API keys will be lost unless you have a backup or export.
        </div>
      </div>

      {resetConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ color: "var(--red)" }}>Reset Vault?</h3>
            <p>
              This will permanently delete your vault file and OS keychain entry.{" "}
              <strong>All stored API keys will be unrecoverable</strong> unless you have an export
              or backup file.
            </p>
            {resetError && <div className="error-banner">{resetError}</div>}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                disabled={resetting}
                onClick={() => { setResetConfirmOpen(false); setResetError(""); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={resetting}
                onClick={() => void handleReset()}
              >
                {resetting ? <span className="spinner" /> : "Yes, Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
