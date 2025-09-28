---
applyTo: '**/*.ts,**/*.tsx'
description: 'React+TS+Vite+XState+Tailwind code generation guidance'
---

# Copilot Guidance: React + TypeScript + Vite + XState + Tailwind

- Enable strict TypeScript; avoid `any`; prefer `unknown` with narrowing when needed.
- Represent turn flow with XState: drawTwo → choose → selectTarget → resolve → checkWin → endTurn.
- Use guards for target legality and skip logic; actions should be pure state updates or event emissions.
- Use Immer for immutable updates in domain logic.
- UI: CSS Grid for 15×15 board; `Cell` components are pure; lift state; avoid global coupling.
- Accessibility: role=grid/gridcell, keyboard navigation, focus ring, ARIA labels (coordinate + state).
- Tests: Vitest for pure logic, RTL for components, Playwright for E2E. Fix seed to ensure deterministic tests.
- Directory layout: src/domain, src/ui, src/net, src/ai; new cards in src/domain/cards + registered in CardRegistry.

[See repo-wide instructions](../copilot-instructions.md) and [game rules](../../docs/Rules.md).
