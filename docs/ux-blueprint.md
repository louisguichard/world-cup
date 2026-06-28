# WC2026 — Phase 2: Analyst-First UI/UX Blueprint

> Official architecture companion: see [implementation-plan.md](./implementation-plan.md) and ADRs in [docs/adr/](./adr/).

## UX Principles

1. **Official truth and predicted truth are never the same element.** Every screen that shows qualification status must render them in separate, visually distinct regions.
2. **Scenario exploration is the primary action.** Every match card and team row has a "branch from here" affordance.
3. **Provenance is always one click away.** Key values expose `ProvenanceTooltip` with provider, authority level, and last ingested timestamp.
4. **Confidence rings, not mystery values.** Below-threshold identity references show amber rings; quarantined references show red rings and are non-interactive.
5. **Change delta highlighting.** SSE updates flash green/red delta indicators for 5s, then fade.
6. **Information density is layered.** Default: card-density. Expanded: analyst density. Full-screen: data-table density.
7. **Admin workflows are visually separated.** Admin shell uses slate/neutral chrome vs tournament primary blue.

## Sitemap

```
/ (root)
├── /dashboard                 Live overview: active matches, qualification delta feed
├── /groups
│   ├── /groups/:groupId       Group detail: standings, schedule, qualification panel
│   └── /groups/compare        Side-by-side group snapshot comparison
├── /bracket                   Knockout bracket with advancement probabilities
├── /scenarios
│   ├── /scenarios/new         Create analyst workspace from current state
│   ├── /scenarios/:id         Active scenario: overrides + live probability updates
│   └── /scenarios/:id/export  Share / export snapshot
├── /match/:matchId            Match detail: events, stats, odds, factor breakdown
├── /team/:teamId              Team profile: form, advancement probability, factors
├── /venue/:venueId            Venue + weather + upcoming matches
└── /admin
    ├── /admin/identity        Identity quarantine queue, alias manager
    ├── /admin/corrections     Correction event log, replay viewer
    ├── /admin/providers       Provider health, source trust config
    └── /admin/qualification   Official rules config, engine version history
```

## Screen Inventory

See plan sections for Dashboard, Group Detail, Bracket, Scenario Workspace, Match Detail, Team Profile, and Admin consoles. Implementation targets:

| Screen | Primary components | Data source |
|--------|-------------------|-------------|
| Group Detail | `OfficialQualificationPanel`, `AdvancementProbabilityPanel` | BC2 / BC3 via QueryAPI + SSE |
| Scenario Workspace | `MatchOverrideCard`, `FactorContributionPanel` | ScenarioService API |
| Team Profile | `AdvancementProbabilityCard`, `FactorProfile` | BC3 |
| Admin Identity | `QuarantineQueue`, `AliasManager` | IdentityService API |

## Component Hierarchy

```
<TournamentShell>
  <GlobalNav />
  <SSEProvider>
    <LiveIndicator />
    <Outlet>
      <GroupsView>
        <OfficialQualificationPanel />   ← BC2, shield icon
        <AdvancementProbabilityPanel />  ← BC3, graph icon
        <ScenarioBranchButton />
      </GroupsView>
      <ScenarioWorkspace />
      <AdminShell>
        <IdentityConsole />
        <CorrectionsConsole />
        <ProviderHealthDashboard />
      </AdminShell>
    </Outlet>
  </SSEProvider>
</TournamentShell>
```

## Frontend State Model

```typescript
officialSlice: { matches, standings, qualification, dataAge }
predictionSlice: { advancementProbabilities, matchPredictions, modelVersion }
scenarioSlice: { activeScenarioId, overrides, result, status, baselineSnapshotId }
uiSlice: { selectedGroup, densityMode, showProvenance, highlightDeltas }
```

**SSE rule:** SSE events update `officialSlice` and `predictionSlice` only. They never mutate `scenarioSlice` directly — they trigger a "base changed" notification.

## Accessibility

- WCAG 2.1 AA minimum
- Probability bars: `aria-valuenow`, text labels
- Official vs predicted: icon + color + label (never color alone)
- `ProvenanceTooltip`: keyboard navigable (Tab, Enter, Escape)
- `prefers-reduced-motion`: static badge instead of flash animation
