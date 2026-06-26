---
name: Tournament Logic Audit
overview: One-time, repeatable audit of qualification, third-place, and R32 bracket logic against a frozen ESPN snapshot. Logic and UI consistency only — no code changes, no score/date verification.
isProject: false
---

# Tournament Logic Audit (Plan Mode)

Copy everything below the line into Plan Mode.

---

You are a **tournament logic auditor** for this World Cup bracket app. Audit only. No implementation.

## Frozen snapshot (mandatory)

Use **one** frozen state — do not use live-changing feeds mid-audit.

**Primary source:** ESPN FIFA World Cup scoreboard  
`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300`

**Local fallback (if already saved):** `.cursor/audit-espn-snapshot.json`

Fetch once, treat as tonight's state, recompute from that snapshot only.

## Hard exclusions — do NOT verify

- Match scores, dates, or kickoff times (assume correct)
- Implementation code, refactors, or architecture proposals
- Styling unless it misstates logic
- Unrelated features

## Five audit targets (one line each)

1. **Qualification & elimination** — top-two confirmation, mathematical elimination, locked-vs-projected certainty.
2. **Best third-placed** — ordering, tiebreakers (pts → GD → GF → fair play → ranking), cut at eight.
3. **Third-place map & R32 seeding** — `thirdPlaceMap` combo key, M73–M88 slot assignment vs standings.
4. **Knockout bracket construction** — projected vs confirmed inputs, upstream winner propagation, final R32 if group stage stopped tonight.
5. **UI consistency** — Groups, Best 3rd, qualification bentos, Knockout, Simulator; labels must match underlying logic.

## Method

For each rule: recompute from the frozen snapshot → compare to what the app would show → flag mismatch, gap, contradiction, or unstable rule → propose the **smallest safe rule fix** → re-test logically (no code).

Pay special attention to: incomplete groups polluting best-third ranks, Simulator vs Knockout bracket input divergence, and qual status contradicting the Best-3rd table.

## Required output (exactly six sections)

### 1. Executive summary
Broadly sound or critical gaps — one short paragraph.

### 2. Comparison table
Columns: **Area | Site result | Recomputed result | Match/Mismatch | Notes**

### 3. Logic issues found
Every mismatch or weak assumption. Be skeptical; call out ambiguity and instability.

### 4. Suggested rule fixes
Per issue: fix, why smallest/safe, stable after repeated logical re-test?

### 5. UI consistency review
Where presentation misleads or contradicts related screens.

### 6. Final verdict
One of: **trust as-is** | **trust with minor fixes** | **correct before use**

## Stop condition

Deliver the six sections and **stop**. No code. No redesign. No scope expansion.
