import { useState, useCallback } from "react";
import { setupVault, unlockSession, ApiError } from "../api.js";

type Props = {
  keychainAvailable: boolean;
  onSetupComplete: () => void;
};

function scorePassphrase(p: string): { score: number; label: string; color: string } {
  if (p.length === 0) return { score: 0, label: "", color: "transparent" };

  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 14) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p)) score++;

  if (score <= 2) return { score: (score / 6) * 100, label: "Weak", color: "var(--red)" };
  if (score <= 4) return { score: (score / 6) * 100, label: "Fair", color: "var(--yellow)" };
  return { score: (score / 6) * 100, label: "Strong", color: "var(--green)" };
}

export default function SetupScreen({ keychainAvailable, onSetupComplete }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = scorePassphrase(passphrase);
  const mismatch = confirm.length > 0 && passphrase !== confirm;

  const handleSubmit = useCallback(async () => {
    if (passphrase !== confirm) { setError("Passphrases do not match."); return; }
    if (passphrase.length < 8) { setError("Passphrase must be at least 8 characters."); return; }

    setError("");
    setLoading(true);
    try {
      if (keychainAvailable) {
        await setupVault(passphrase);
      } else {
        await unlockSession(passphrase);
      }
      onSetupComplete();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Setup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [passphrase, confirm, keychainAvailable, onSetupComplete]);

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1>API Vault — First Setup</h1>

        <p>
          {keychainAvailable
            ? "Create a master passphrase. It will be stored securely in your OS keychain and never saved to disk."
            : "Keychain unavailable (native bindings not built). Enter a passphrase to unlock this session. The vault stays encrypted at rest; you will re-enter this passphrase each server restart."}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="passphrase">Passphrase</label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter a strong passphrase"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
          />
          {passphrase.length > 0 && (
            <>
              <div className="strength-bar-wrap">
                <div
                  className="strength-bar"
                  style={{ width: `${strength.score}%`, background: strength.color }}
                />
              </div>
              <div className="strength-label" style={{ color: strength.color }}>
                {strength.label}
              </div>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm Passphrase</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat passphrase"
            style={mismatch ? { borderColor: "var(--red)" } : undefined}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
          />
          {mismatch && <div className="field-error">Passphrases do not match.</div>}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => void handleSubmit()}
          disabled={loading || passphrase.length < 8 || passphrase !== confirm}
          style={{ width: "100%", justifyContent: "center", padding: "10px" }}
        >
          {loading ? <span className="spinner" /> : null}
          {keychainAvailable ? "Create Vault" : "Unlock Session"}
        </button>

        <div className="setup-warning">
          If you lose this passphrase, your encrypted keys cannot be recovered.
          There is no reset without losing all stored keys.
        </div>
      </div>
    </div>
  );
}
