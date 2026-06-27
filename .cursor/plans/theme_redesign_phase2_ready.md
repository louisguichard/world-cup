# Theme Redesign Phase 2 — FWC 2026 Brand

Status: READY TO EXECUTE  
Gate: Run `npm run uidebug` and confirm 0 issues before starting  
Prerequisite: All FIX-01 through FIX-09 must be complete and committed  
Last updated: build 12

---

## Cursor execution prompt

You are a senior front-end engineer on the World Cup 2026 app. Execute **Theme Redesign Phase 2** — FIFA-inspired visual rebrand for chrome + main tabs. Do not touch Match detail, Team sheets, Tournament, or Simulator in this phase.

### Locked decisions

| # | Decision |
|---|----------|
| 1 | Scope: **Chrome + main tabs** — Live, Schedule, Groups, Bracket, Results, Teams |
| 2 | FIFA fidelity: **Inspired** — FIFA cues, our hierarchy/spacing |
| 3 | Themes: **Both** light and dark fully designed |
| 4 | Priority: **Live-first** rollout |
| 5 | Success: **Zero `?uidebug=1` issues** on main tabs (mobile 390 + desktop 1280) |
| 6 | Typography: **FWC display/scores only** — system stack for body |
| 7 | Cards: **Keep fixture glows** — polish edges/containment |
| 8 | Team identity: **Mute washes** — keep flags/crests |
| 9 | Motion: Rich broadcast energy; goal celebration + scorer photo |
| 10 | Live card names: Short ESPN-style via `teamLiveCardNames.ts` |

### Token architecture (extend, do not rewrite)

```
styles.css          → @font-face, FWC root, keyframes
tokens.css          → semantic bridge (--text, --surface, --line)
themes.css          → light/dark FIFA-inspired palettes
layout.css          → chrome (nav, main, stripe)
app-views.css       → tab views + live hero + schedule
modules.css         → bento modules, cards, badges
team-identity.css   → team flags, labels (unchanged behavior)
edges.css           → glow wrappers, shadow bleed
```

### New / updated CSS custom properties

Add to `tokens.css` / `themes.css`:

```css
:root {
  --font-display: "FWC", "WorldCup26", system-ui, sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --heading-weight: 700;

  /* FWC 2026 inspired palette */
  --fwc-royal-blue: #0033a0;
  --fwc-gold: #c9a227;
  --fwc-crimson: #c8102e;
  --fwc-mint: #00a651;

  --section-kicker-size: 0.72rem;
  --section-kicker-spacing: 0.14em;

  --motion-fast: 120ms ease;
  --motion-medium: 220ms ease;
  --motion-slow: 380ms ease;
}
```

Light/dark parity: body text contrast ≥ 4.5:1 on `--surface`; accent stripe visible in both themes.

### Typography rules

| Element | Font | Notes |
|---------|------|-------|
| Live score | `--font-display` | Tabular nums |
| Section kicker | `--font-display` | Uppercase, letter-spacing |
| LIVE / FINAL pill | `--font-display` | Weight 700 |
| Body, tables, meta | `--font-body` | Not FWC |
| Group table headers | `--font-body` | Weight 600 |

Remove FWC from `.team-name-text` in body/table contexts; keep for scores and kickers only.

### Component rules

**Cards / bentos**
- Keep `--surface-shadow-bleed` / `--fixture-glow-bleed`
- Every glow wrapper gets intentional padding or `overflow: visible` on parents
- Mute `--match-home/away` wash intensity ~10–20% softer

**Buttons**
- Primary: `--fwc-royal-blue` fill, white text
- Ghost: transparent + `--line` border
- Focus: `outline: 2px solid var(--fwc-royal-blue)`

**Tables**
- Header row: `--font-body` 600, `--text-muted`
- Row hover: subtle `--surface-raised` wash
- Qualification row classes unchanged in behavior — token colors only

### Phased sequence

1. **Phase A** — Tokens + typography + chrome (TopNav, BottomTab, section headings)
2. **Phase B** — Live layout fixes (P0 mobile overflow, glow containment)
3. **Phase C** — Schedule + Results card tokens
4. **Phase D** — Groups + Bracket + Teams table/card tokens
5. **Phase E** — `npm run ui:debug-sweep` gate (0 issues all 6 tabs × 2 viewports)

### Layout fix backlog (from ui-debug sweep)

| Priority | Screen | Fix |
|----------|--------|-----|
| P0 | Live mobile | `team-flag-badge` horizontal overflow in scorer rows |
| P0 | Live mobile | `section.dashboard-section` +16px horizontal bleed |
| P1 | Results | `team-flag-inner.sm` vertical clip |
| P1 | Teams desktop | `teams-row--accent` overflow + clip |
| P2 | Live | `span.accent` collision in h1 |

### Out of scope

- MatchDetailView, TeamDetailSheet, TournamentView, SimulatorView
- Highlightly / stream tabs
- New API or data work

### QA gate

```bash
npm run build
npm run ui:debug-sweep   # or npm run uidebug if aliased
```

Manual: light + dark spot-check on all 6 main tabs.

### Risks

- Glow fixes re-introduce edge clipping → test sweep after each change
- FWC + system font mix → limit FWC to scores/kickers only
- Rich motion on mobile → respect `prefers-reduced-motion`

---

Say **start Phase A** to begin implementation against this plan.
