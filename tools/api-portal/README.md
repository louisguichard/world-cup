# API Vault Portal

A local encrypted API key manager for developer workflows. Stores keys in an AES-256-GCM encrypted vault, using the OS keychain as the trust anchor. Never committed, never deployed.

## Architecture

- **Node sidecar** on `127.0.0.1:4242` — Express API, file I/O, encryption
- **Vite React UI** on `localhost:4243` — browser portal
- **`.portal-keys.enc`** — encrypted vault (gitignored)
- **OS keychain** — master key anchor (macOS Keychain / Windows Credential Manager)

## Prerequisites

### macOS

1. Install Xcode Command Line Tools (required for keytar native bindings):
   ```bash
   xcode-select --install
   ```
2. Node 20 or higher
3. npm 10 or higher

### Windows

No extra setup. The `keytar` package uses Windows Credential Manager automatically.

## Install

```bash
cd tools/api-portal
npm install
```

If keytar fails to build native bindings:
```bash
npm rebuild keytar
```

If keytar still fails (rare — e.g. unsupported Node ABI), the portal falls back to **session unlock mode**: enter your passphrase each time the server starts. Your vault stays encrypted at rest; the key is held in memory only for the session.

## Usage

Start the portal (server + UI together):

```bash
# From repo root
npm run dev:portal

# Or from this directory
npm run dev
```

Open `http://localhost:4243` in your browser.

On first run, you will be prompted to create a master passphrase. It is derived via PBKDF2 (100k iterations) and stored in the OS keychain — never on disk.

## CLI Sync

Write keys to a project's `.env.local` without opening the browser:

```bash
# From repo root — sync to Road to the World Cup Final 2026 target
npm run sync-keys:wc

# Sync all configured targets
npm run sync-keys

# From this directory — sync a specific named target
npm run sync-keys -- "Road to the World Cup Final 2026"
```

The sync command verifies that the target `.env.local` file is listed in the project's `.gitignore` before writing. If not, it aborts with a clear error.

## Security Model

| Layer | What happens |
|---|---|
| At rest | Vault encrypted AES-256-GCM; master key in OS keychain |
| In transit | Localhost-only; CORS restricts to `:4243` |
| After sync | `.env.local` is plaintext on disk, gitignored |
| Memory | Master key evicted after 30 min idle |
| Logs | Only key ID + label logged, never plaintext values |

## Recovery

If a key is accidentally deleted, check for backup files:

```
tools/api-portal/.portal-keys.enc.bak.<timestamp>
```

The last 3 backups are kept automatically before any destructive operation.

To restore:
```bash
cp .portal-keys.enc.bak.<timestamp> .portal-keys.enc
```

## Recommended Road to the World Cup Final 2026 setup

After first run, add a sync target via the UI:

- **Name**: `Road to the World Cup Final 2026`
- **Path**: `/Users/<you>/Developer/world-cup/.env.local`
- **Keys**: `VITE_RAPIDAPI_KEY`, `VITE_ZAFRONIX_API_KEY`, `VITE_THESTATS_API_KEY`, `VITE_ODDS_API_KEY`
