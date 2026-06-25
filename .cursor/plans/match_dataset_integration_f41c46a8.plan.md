---
name: Match Dataset Integration
overview: Integrate the user's complete 104-match fifa_wc2026_complete_v2.json into the plan — replacing manual broadcasts.json entry with matchSchedule.json + BroadcastLookup.ts, USA-only TV chips for v1.
todos:
  - id: copy-match-schedule
    content: "Prompt 2: Copy fifa_wc2026_complete_v2.json → src/data/matchSchedule.json"
    status: completed
  - id: broadcast-lookup
    content: "Prompt 2: BroadcastLookup.ts — index M{n}, normalize USA networks + streaming"
    status: completed
  - id: wire-tv-chips
    content: "Prompts 5+14: TV chips on LiveMatchBento and GroupsView upcoming rows"
    status: completed
  - id: v2-betting-analytics
    content: "v2 backlog: The Odds API, TheStatsAPI live, Canada/Mexico broadcasts"
    status: cancelled
isProject: false
---

# Match Dataset Integration — Plan Update

Your [`fifa_wc2026_complete_v2.json`](/Users/RonalSorto/Downloads/fifa_wc2026_complete_v2.json) (~1 MB, 104 matches) **closes Micro-Gap 6** and removes the manual data-entry launch blocker.

## What the file provides

| Section | v1 use | v2 defer |
|---------|--------|----------|
| `kickoff.utc` | Canonical kickoff via `Intl.DateTimeFormat` | Pre-converted ET/PT strings ignored |
| `venue` | Stadium/city on match cards | Full capacity/timezone metadata |
| `broadcast.USA` | FOX/FS1 + Telemundo/Universo + streaming chips | Canada/Mexico, cable grids, zip-based affiliates |
| `broadcast.USA.concurrentMatchNote` | Warning badge on overflow matches | — |
| `betting` | — | The Odds API / Betfair (Polymarket already in app) |
| `analytics` | — | TheStatsAPI live (SofaScore/ESPN remain live sources) |

## Locked decisions (from your answers)

- **v1 TV chips:** USA English network + Spanish network + streaming list only
- **Bundle:** Commit full JSON; static import in `BroadcastLookup.ts`
- **Match key:** `matchNumber` 1–104 → `M1`…`M104` (aligns with existing [`knockoutSchedule.ts`](src/data/knockoutSchedule.ts))

## Implementation (Prompt 2)

1. Copy Downloads file → [`src/data/matchSchedule.json`](src/data/matchSchedule.json)
2. Add `MatchScheduleEntry` + `BroadcastChip` types to [`src/types.ts`](src/types.ts)
3. Create [`src/services/BroadcastLookup.ts`](src/services/BroadcastLookup.ts):
   - `buildBroadcastIndex()` at module load
   - `getBroadcast('M73')` returns normalized chip
   - Parse `streaming` string into `string[]`
   - `isConcurrent: !!concurrentMatchNote`
4. Wire into `LiveMatchBento` + `GroupsView` upcoming rows (Prompts 5 + 14)
5. `DataMerger` links live ESPN events → `M{n}`; `espnEventId` lives in Zustand runtime, not static JSON

## Kickoff rendering

```typescript
// Always use UTC + browser timezone — never ET_Eastern etc.
new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' })
  .format(new Date(match.kickoff.utc));
```

## What stays unchanged

- Live polling: **SofaScore primary, ESPN fallback** (not TheStatsAPI)
- Odds: **Polymarket** in Simulator/Odds tab (not The Odds API in v1)
- [`knockoutSchedule.ts`](src/data/knockoutSchedule.ts) kept as fallback if lookup misses

## Removed from plan

- Manual ~90 min M73–M104 data entry
- Slim `broadcasts.json` stub schema
- "broadcasts.json launch blocker" acceptance criteria

## Updated prompt sequence

| Prompt | Change |
|--------|--------|
| **2** | + copy `matchSchedule.json` + `BroadcastLookup.ts` |
| **5** | LiveMatchBento shows USA TV chips from lookup |
| **14** | GroupsView upcoming uses `kickoff.utc` from lookup |

Say **execute the plan** when ready to start Prompt 1.
