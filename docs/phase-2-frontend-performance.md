# Phase 2 — Frontend Performance Architecture

**Status:** Planning document (post Phase 1, build 71)  
**Scope:** Browser-only — no backend, workers, or infrastructure changes  
**Prerequisite:** Phase 1 complete (`usePollingGov`, SSE cleanup, cold-tier fetch-once, `PanelErrorBoundary`)

Phase 1 fixed **timer leaks and idle-tab API spam**. Phase 2 fixes **initial load weight**, **offline resilience**, and **unnecessary React re-renders** during long live sessions.

---

## Goals

| Goal | Success metric |
|------|----------------|
| Faster first paint on mobile | Main JS chunk &lt; 400 kB gzip (from ~143 kB today on a 1.15 MB raw bundle) |
| Offline usable shell | Last-known scores + standings visible with no network |
| Stable live tab for hours | Poll-driven re-renders limited to subscribed subtrees, not full view trees |

---

## Current baseline (build 71)

Production build (`pnpm run build`):

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index-*.js` (main) | **1,150 kB** | **143 kB** | Qualification engine, orchestrator, boot path — too much in entry |
| `vendor-*.js` | 286 kB | 87 kB | React + ReactDOM (manual chunk ✓) |
| `zustand-*.js` | 28 kB | 10 kB | Manual chunk ✓ |
| `index-*.css` | 161 kB | 31 kB | Single CSS bundle |
| Route chunks | 7–121 kB each | Lazy-loaded via `AppShell` ✓ |

**Already lazy-loaded routes** (`src/components/layout/AppShell.tsx`):

- Live, Results, Bracket, Groups, Teams, Simulator, Schedule, Tournament, VenueHub, MatchDetail, TeamDetailSheet

**Already split sub-chunks** (`LiveView.tsx`):

- BestThirdLiveGraph, LiveBracketEmbed, RecentResultsBento, Qualified/InContention/Eliminated bentos

**PWA today** (`public/sw.js`, `src/lib/registerServiceWorker.ts`):

- Network-first for static assets; offline fallback to cache
- Precache: shell HTML, manifest, logos, icons only
- **Does not** cache API responses or localStorage boot data explicitly in SW
- Boot hydration uses **localStorage** (`bootCache.ts`, `standingsCache.ts`, `liveMatchCache.ts`)

---

## Pillar 1 — PWA offline cache

### Mental model

Three layers, outer to inner:

```
┌─────────────────────────────────────────┐
│  Service Worker (static shell + stale)   │
├─────────────────────────────────────────┤
│  localStorage boot cache (teams/matches) │
├─────────────────────────────────────────┤
│  Live network (SSE + poll fallback)      │
└─────────────────────────────────────────┘
```

Offline UX = **show last-known official state** with a clear stale banner (already partially handled by `DataFreshnessBanner`).

### Phase 2A — Service worker upgrades

**File:** `public/sw.js`  
**Bump cache version:** `wc-shell-v5` → `wc-shell-v6`

| Strategy | URL pattern | Behavior |
|----------|-------------|----------|
| **Precache** | `/`, `/index.html`, `/manifest.json`, icons, fonts | Install-time |
| **Stale-while-revalidate** | `/assets/*.js`, `/assets/*.css` | Return cache immediately; update in background |
| **Network-only** | `/api/*`, `/espn*`, `/rapidapi*`, `/poly*` | Never cache (correct today) |
| **Offline navigation** | `navigate` mode | Fallback to `/index.html` (correct today) |

**Implementation sketch:**

```js
// Stale-while-revalidate for hashed build assets
if (url.pathname.startsWith("/assets/")) {
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then((res) => {
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      });
      return cached ?? network;
    })
  );
  return;
}
```

**Do not** cache RapidAPI/ESPN proxy responses in SW — quota, auth, and stale odds are worse than offline.

### Phase 2B — Boot cache as offline source of truth

**Files:** `src/lib/bootCache.ts`, `src/lib/standingsCache.ts`, `src/lib/liveMatchCache.ts`, `src/lib/bootstrap.ts`

On bootstrap failure (airplane mode):

1. `readBootCache()` hydrates teams + matches + standings (already exists)
2. Store sets `dataFreshness: 'cached'` (extend `dataFreshness.ts` if needed)
3. `DataFreshnessBanner` shows “Offline — showing cached data” (copy in `appCopy.ts`)

**New helper** — `src/lib/offlineReadiness.ts`:

```ts
export function hasOfflineBootData(): boolean {
  return readBootCache().hadCache;
}
```

Wire into splash: if network bootstrap fails but cache exists, proceed to app (don't block on SplashScreen).

### Phase 2C — Optional: Cache Storage for large payloads

For payloads &gt; localStorage limits (~5 MB total):

| Key | Content | TTL |
|-----|---------|-----|
| `wc-schedule-v1` | Materialized schedule JSON | 24h |
| `wc-bracket-v1` | Knockout bracket snapshot | 24h |

Use `idb-keyval` or native `caches.open('wc-data-v1')` — **only if** schedule materialization moves out of main bundle.

### Phase 2D — Install / update UX

**Files:** `src/lib/pwaInstallController.ts`, `src/lib/registerServiceWorker.ts`

- Listen for `registration.waiting` → show “Update available” toast
- Call `registration.waiting.postMessage({ type: 'SKIP_WAITING' })` after user confirms
- Reload once `controllerchange` fires

---

## Pillar 2 — Code-splitting map

### Target dependency graph

```mermaid
flowchart TD
  entry[index.tsx bootstrap]
  shell[AppShell]
  vendor[vendor chunk]
  store[zustand + store]
  qual[@wc2026/qualification]
  orch[DataOrchestrator]
  views[Route lazy chunks]

  entry --> shell
  entry --> vendor
  shell --> store
  views --> store
  views --> qual
  orch --> qual
  entry -.->|move to dynamic import| orch
  entry -.->|move to dynamic import| qual
```

### Recommended `vite.config.ts` manual chunks

**File:** `vite.config.ts` — extend `build.rollupOptions.output.manualChunks`:

```ts
manualChunks(id) {
  if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
    return "vendor";
  }
  if (id.includes("node_modules/zustand")) return "zustand";
  if (id.includes("node_modules/lucide-react")) return "icons";
  if (id.includes("packages/qualification")) return "qual-engine";
  if (id.includes("services/orchestrator")) return "orchestrator";
  if (id.includes("simulator/")) return "simulator";
  if (id.includes("pages/match/")) return "match-detail";
  return undefined; // let Rollup decide for route lazy boundaries
}
```

**Expected outcome:** main `index-*.js` drops from ~1,150 kB → ~600–750 kB raw; qualification + orchestrator load on first live tick or tab navigation.

### Route chunk inventory

| Hash tab | Lazy import | Current chunk | Phase 2 action |
|----------|-------------|---------------|----------------|
| `#live` | `LiveView` | ~40 kB | Split analyst panels to nested lazy |
| `#groups` | `GroupsView` | ~46 kB | Lazy `GroupTableBento` per group (virtualize 12 tables) |
| `#schedule` | `ScheduleView` | ~29 kB | OK |
| `#simulator` | `SimulatorView` | ~83 kB | **Priority split** — worker already separate file |
| `#match/*` | `MatchDetailView` | ~121 kB | Lazy tabs: Watch, Highlights, Statistics |
| `#tournament` | `TournamentView` | ~55 kB | Lazy stats tabs |

### Dynamic imports to add (ordered by ROI)

1. **`SimulatorView`** — import `simulationWorker` path only when simulator tab opens (worker file already at `dist/assets/simulationWorker-*.js`).
2. **`MatchDetailView` tabs** — `MatchWatchTab`, `MatchHighlightsTab`, `MatchStatisticsTab` as `React.lazy` inside tab switch (saves ~30 kB on summary-only visits).
3. **`DataOrchestrator`** — dynamic import in `bootstrap.ts` after first paint:

   ```ts
   const { DataOrchestrator } = await import("../services/orchestrator/DataOrchestrator");
   await DataOrchestrator.getInstance().boot();
   ```

4. **Analyst / BC3 panels** — `AdvancementProbabilityPanel`, `ScenarioWorkspace` only on simulator or analyst routes (already partially isolated).

### CSS splitting

Single 161 kB CSS bundle. Phase 2 optional:

- `cssCodeSplit: true` (Vite default for lazy routes) — ensure each lazy view imports its own CSS modules only
- Move `ui-debug.css` behind `import.meta.env.DEV` only (already dynamic in `main.tsx` ✓)

### Bundle budget CI gate

Add script `scripts/check-bundle-budget.mjs`:

```js
// Fail CI if main chunk gzip > 150 kB or any chunk raw > 600 kB
```

Wire into `package.json` as `"check:bundle": "node scripts/check-bundle-budget.mjs"` after `build`.

---

## Pillar 3 — React memo audit

### Problem

`PollingEngine` → `batchPollUpdate` → `liveMatches` changes every 15–30s. Any component subscribing to `liveMatches` or full `groupStandings` re-renders **all** children unless memoized or selector-narrowed.

### Subscription tiers

| Tier | Store slices | Update frequency | Rule |
|------|--------------|------------------|------|
| **Hot** | `liveMatches[id]`, `matchEvents[id]` | 15s | Per-match selectors only |
| **Warm** | `groupStandings`, `lastPollAt` | 30s–2min | Selector + `shallow` compare |
| **Cold** | `teams`, `knockoutMarkets` | Boot + rare | Stable refs OK |

### High-priority memo candidates

Components with **broad store subscriptions** and **list rendering** (fix first):

| Component | File | Issue | Fix |
|-----------|------|-------|-----|
| `LiveMatchBento` | `bentos/LiveMatchBento.tsx` | `teams`, `matchEvents` whole maps | `memo()` + props: pass `home`, `away`, `events` from parent selector |
| `GroupTableBento` | `bentos/GroupTableBento.tsx` | `liveMatches`, full `standings` | Pass `qualContext` + `bubbleTeamIds` as props; wrap in `memo` |
| `MatchScheduleCard` | `match/MatchScheduleCard.tsx` | 4 store selectors | Single `useMatchCardData(matchId)` selector hook |
| `LiveGroupStandingsPanel` | `bentos/LiveGroupStandingsPanel.tsx` | Recomputes on any live match | Scope to `group` prop |
| `BracketBento` | `bentos/BracketBento.tsx` | 6 selectors | Split container/presentational |
| `TeamDetailSheet` | `team-detail/TeamDetailSheet.tsx` | 10 selectors | Lazy-load tabs; narrow to `teamId` |
| `SimulatorView` | `simulator/SimulatorView.tsx` | 6 selectors | Isolate simulation state in ref/context |

### Selector patterns (copy-paste conventions)

**Per-match live data** — add `src/store/selectors/matchSelectors.ts`:

```ts
import { useStore } from "../index";
import type { MergedMatch } from "../../types";

export function useLiveMatch(matchId: string | undefined): MergedMatch | undefined {
  return useStore((s) => (matchId ? s.liveMatches[matchId] : undefined));
}
```

**Shallow standings row** — extend `qualificationSelectors.ts`:

```ts
import { useShallow } from "zustand/react/shallow";

export function useGroupStanding(group: GroupLetter) {
  return useStore(
    useShallow((s) => s.groupStandings.find((g) => g.group === group))
  );
}
```

### `React.memo` rules for this codebase

1. Wrap **leaf** display components: `TeamFlag`, `TeamLabel`, `StandingThemeRow`, `WeatherBadge`, `OddsRow` (presentational half).
2. **Do not** memo `AppShell` — it must react to tab/splash/navigation.
3. Custom compare only when props include large arrays; prefer selector narrowing first.
4. Pair `memo` with stable callbacks from parent (`useCallback`) for click handlers.

### AppShell re-render containment

**File:** `src/components/layout/AppShell.tsx`

Split into:

```
AppShell (navigation + splash only)
  └── TabOutlet (memo, receives activeTab)
        └── lazy views
```

Move `lastGoalAnnouncement` subscription to `LiveView` only (not shell-level) so goal toasts don't re-render Schedule/Groups.

### Audit checklist (run before closing Phase 2)

- [ ] React DevTools Profiler: 5 min on `#live` with 3+ live matches — &lt; 30 commits/sec idle
- [ ] No component &gt; 50 children re-rendering on single `batchPollUpdate`
- [ ] `useLiveClock` ticks do not propagate past clock label DOM node
- [ ] Zustand devtools: verify selector equality fn fires &lt; 10% of poll ticks for cold components

---

## Implementation sequence

| Step | Effort | Impact | Files |
|------|--------|--------|-------|
| **2.1** Dynamic import DataOrchestrator boot | 2h | High | `bootstrap.ts`, `appLifecycle.ts` |
| **2.2** manualChunks function + qual-engine split | 1h | High | `vite.config.ts` |
| **2.3** SW stale-while-revalidate for `/assets/*` | 2h | Med | `public/sw.js` |
| **2.4** Offline bootstrap path | 3h | Med | `bootstrap.ts`, `SplashScreen.tsx`, `dataFreshness.ts` |
| **2.5** Match selectors + memo LiveMatchBento | 4h | High | `matchSelectors.ts`, bentos |
| **2.6** Lazy MatchDetail tabs | 2h | Med | `MatchDetailView.tsx` |
| **2.7** Bundle budget script | 1h | CI guard | `scripts/check-bundle-budget.mjs` |
| **2.8** PWA update toast | 2h | Low | `pwaInstallController.ts` |

**Total estimate:** ~2–3 dev days, frontend-only.

---

## Explicit non-goals (Phase 2)

- Server-side rendering or edge functions
- IndexedDB sync of full event log
- Rewriting Zustand to Redux/React Query
- Memoizing every component (diminishing returns after hot-path list)

---

## Validation

After Phase 2 implementation:

```bash
pnpm run build && pnpm run check:bundle   # budget gate
pnpm test                                  # 503+ tests
# Lighthouse PWA + Performance on #live
# Chrome Performance: 30 min live tab, heap stable ±5 MB
```

---

## Related docs

- Phase 1 (implemented): polling governor, SSE cleanup — see CHANGELOG build 71
- [local-dev.md](./local-dev.md) — dev server setup
- [ux-blueprint.md](./ux-blueprint.md) — official vs prediction visual regions (memo boundaries must respect BC2/BC3 separation)
