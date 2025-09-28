# GitHub Copilot — Repository Instructions

This repository contains a React + TypeScript + Vite “Gomoku + card-draw” game. When generating changes in this repo, follow these rules and style guidelines.

## General principles

- Project info is in `docs/Info.md`.
- Treat `docs/Rules.md` as the single source of truth for gameplay. When conflicts arise, Rules.md wins.
- Code must be type-safe (strict TS), primarily functional, testable, and reproducible (seeded RNG).
- Keep strict layering: domain (pure TS, no UI/network) vs. app (UI). Do not implement core rules in the UI layer.
- Use XState + Immer for state management. Centralize side effects; avoid scattering them across components.
- Any new feature must ship with tests (Vitest/RTL/Playwright) and documentation comments.

## Code style

- React function components + hooks. Avoid class components. Be cautious with global Context (prefer local props/state).
- Prefer Tailwind; CSS Modules second. Avoid inline style objects.
- Clear naming: functions start with verbs; booleans use is/has/can; constants SCREAMING_SNAKE_CASE.
- Organize by domain: `src/domain/**`, `src/ui/**`, `src/net/**`, `src/ai/**`.
- Export a minimal API; keep internals private; avoid leaking unnecessary types.

## Rules and randomness

- All randomness (shuffles, random placements) must use the unified PRNG from the rng module and accept a seed.
- Perform win checks immediately after effect resolution. Simultaneous five policy follows Rules.md.

## Card system

- New cards must implement the `CardDefinition` interface: id, target, canPlay, validateTarget, effect.
- Never manipulate UI in `effect`; only return events or immutable patches for context.
- Register the card in a central `CardRegistry` so the UI can automatically display name/icon/description.

## Tests and quality

- Write unit tests for rules/cards/state machine. Any new public behavior must include at least one test.
- E2E tests must cover a full turn flow and at least one skill card.
- CI must pass Lint/Typecheck/Test/Build/Format. Do not submit changes that break the build.

## Commits and docs

- Use a module prefix in commit messages, e.g., `domain: implement win detection`.
- If rules change, update `docs/Rules.md` and note the impact in the commit.

For tech stack specifics, see instruction files under `.github/instructions/`.
