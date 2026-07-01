# Phase 4 — QA checklist & release freeze

Automated gate (run before every release during knockout):

```bash
npm run qa:phase4
```

This runs `src/lib/phase4Acceptance.test.ts` and a production build.

Full unit suite:

```bash
npm test
```

---

## Manual smoke (~15 minutes)

Do once after Phases 1–3 land, and again before tagging a release during live knockouts.

### 1. No flash-revert after refresh

1. Open **Live** tab during or right after a knockout finishes.
2. Hard refresh (`Cmd+Shift+R`).
3. Note the finished match id (`M##` in match detail or Results).
4. Watch bracket / live context for **30 seconds**.
5. **Pass:** scores and advancement do not revert; eliminated teams stay out of R16.

### 2. Live recent = Results tab

1. Pick the same finished match from **Live → Recent scores**.
2. Open **Results** tab and find the same fixture.
3. **Pass:** same official id (`M##`), same scoreline (including pens if applicable).

### 3. Bracket tree downstream slot

1. Open **Bracket** tab → **Bracket tree** (desktop ≥1024px).
2. Find the R32 match you noted → follow connector to R16.
3. **Pass:** downstream slot shows the **winner only**, not the loser.

### 4. Live embed → full tree

1. On **Live** tab, scroll to knockout embed.
2. Click **Open bracket tree →**.
3. **Pass:** lands on Bracket tab in tree layout.

### 5. Eliminated team status

1. Open team sheet for a team eliminated in R32 (e.g. lost on pens).
2. **Pass:** no false “moving on” / R16 path; bracket cards do not show them as confirmed in a later round.

---

## Freeze rule (Phases 1–4)

Do **not** add new bracket data paths or layout experiments until:

- [ ] `npm run qa:phase4` passes
- [ ] Manual smoke above is green on a live knockout day
- [ ] Any regression gets a test in `phase4Acceptance.test.ts` or the relevant module test file

Allowed without breaking freeze: copy tweaks, CSS polish, provider outage handling, version bumps for bug fixes that include regression tests.

---

## Build history (Phases 1–4)

| Phase | Build | Focus |
|-------|-------|--------|
| 1 | 56 | `commitLiveMatchStore`, boot poll gate, locked KO standings |
| 2 | 57 | Unified completed results view model |
| 3 | 58 | Live tree link, knockout desktop tree default |
| 4 | 60 | QA gate tests + checklist |
