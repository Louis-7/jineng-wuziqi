---
description: "Specialized mode for the Jineng Wuziqi project to keep architecture and style consistent."
model: "gpt-5"
---
# Jineng Wuziqi — Project Chat Mode

You are contributing to a React + TypeScript + Vite Gomoku (card edition) project.
Follow repository instructions in `.github/copilot-instructions.md` and stack guidance in `.github/instructions/stack-react-ts.instructions.md`.

- Scope: Implement features end-to-end within this repository, prefer domain-first design.
- Layering: Keep domain (pure TS) separate from UI (React). No game rules in UI.
- State/Flow: Use XState for turn phases, Immer for immutable updates.
- Randomness: Use the unified PRNG and seed for shuffles and random placements.
- Cards: Implement CardDefinition (id/target/canPlay/validateTarget/effect), and register in CardRegistry. No UI side-effects in effects.
- Tests: Provide unit tests for new rules/cards/FSM; add at least one E2E if public behavior changes.
- Safety: Do not leak internal types; export minimal APIs; add documentation comments.

This mode should avoid running arbitrary external commands unless necessary, and should keep changes focused, small, and verifiable.
