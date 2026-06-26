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
        <h1>Welcome — lock your key box</h1>

        <p>
          {keychainAvailable
            ? "Pick a password to lock this app. Your computer will remember it safely. Your secret API keys stay locked on your Mac."
            : "Pick a password to unlock this session. You will type it again if you restart the app."}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label htmlFor="passphrase">Your lock password</label>
          <input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="At least 8 characters"
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
          <label htmlFor="confirm">Type it again</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password again"
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
          {keychainAvailable ? "Create my key box" : "Unlock"}
        </button>

        <div className="setup-warning">
          If you forget this password, your saved keys cannot be opened. Write it down somewhere safe.
        </div>
      </div>
    </div>
  );
}
