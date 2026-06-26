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
    if (!confirm("This downloads a file with ALL your keys in plain text. Save it somewhere safe, then delete the file.")) return;
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
      <div className="page-title">Lock &amp; Backup</div>

      <div className="settings-section">
        <h3>Your computer&apos;s lock</h3>
        <div className="settings-row">
          <span className="label">Safe storage on Mac</span>
          <span className={status.keychainAvailable ? "status-ok" : "status-warn"}>
            {status.keychainAvailable ? "✓ Yes" : "⚠ Not available (session only)"}
          </span>
        </div>
        <div className="settings-row">
          <span className="label">Lock password saved</span>
          <span className={status.keychainSetup ? "status-ok" : "status-warn"}>
            {status.keychainSetup
              ? status.keychainAvailable
                ? "✓ Saved on your Mac"
                : "✓ Unlocked this session"
              : "⚠ Not set up yet"}
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
        <h3>Where keys are stored</h3>
        <div className="settings-row">
          <span className="label">Locked file on disk</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)" }}>
            tools/api-portal/.portal-keys.enc
          </span>
        </div>
        <div className="settings-row">
          <span className="label">File exists</span>
          <span className={status.vaultExists ? "status-ok" : "status-warn"}>
            {status.vaultExists ? "✓ Yes" : "Not created yet"}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Save a backup copy</h3>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
          Export makes a file with all your keys in plain text. Keep it somewhere safe, then delete the file.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            Download backup file
          </button>
          <button className="btn btn-ghost" disabled={importing} onClick={handleImport}>
            {importing ? <span className="spinner" /> : "Load from backup file"}
          </button>
        </div>
        {importError && <div className="error-banner" style={{ marginTop: 10 }}>{importError}</div>}
        {importSuccess && (
          <div style={{ marginTop: 10, color: "var(--green)", fontSize: 12 }}>
            ✓ Backup loaded. Your keys are locked again.
          </div>
        )}
      </div>

      <div className="settings-section" style={{ borderColor: "rgba(240,82,82,0.3)" }}>
        <h3 style={{ color: "var(--red)" }}>Danger — delete everything</h3>
        <div className="settings-row">
          <span className="label">Erase all saved keys</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setResetConfirmOpen(true)}
          >
            Delete my key box
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
          This deletes every saved key forever unless you made a backup first.
        </div>
      </div>

      {resetConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ color: "var(--red)" }}>Delete everything?</h3>
            <p>
              This erases all your saved keys.{" "}
              <strong>You cannot get them back</strong> unless you downloaded a backup.
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
                {resetting ? <span className="spinner" /> : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
