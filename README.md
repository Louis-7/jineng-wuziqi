# Jineng Wuziqi (Gomoku + Cards)

Deterministic, seed-driven Gomoku variant with a draw–play–discard skill card system. Built with React + TypeScript + Vite. Core rules and card effects live in a pure domain layer for future networking and AI.

## Features (MVP)

- 15×15 board, win on 5+ in a row (overlines count)
- Turn flow: draw 2 → choose 1 (play) → discard 1 → (target if needed) → resolve → win check
- Seeded RNG (deterministic deck + random effects)
- Skill cards: Place, Take, Polarity Inversion, Time Freeze, Spontaneous Generation
- Simultaneous five policy configurable: attacker wins (default) or draw
- Turn FSM with XState (drawTwo → choose → selectTarget → resolve → checkWin → endTurn)
- Board themes: Modern (neutral) + Classic (wooden with 3D stones), persisted via LocalStorage
- Accessibility: ARIA grid, tabbable intersections, visually highlighted last move and winning line

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (default Vite port).

## Scripts

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `npm run dev`        | Start Vite dev server                  |
| `npm run build`      | Typecheck then bundle production build |
| `npm run test`       | Run Vitest test suite (unit + RTL)     |
| `npm run test:watch` | Watch mode tests                       |
| `npm run lint`       | ESLint (no warnings allowed)           |
| `npm run typecheck`  | TypeScript only (no emit)              |
| `npm run format`     | Prettier write                         |

## Testing

- Framework: Vitest + @testing-library/react
- Coverage expectations (to be enforced): board logic, deck shuffle/draw, card effects, FSM transitions.
- UI tests cover modal flows, theme switching, targeting validation, winner UI.

## Core Architecture

```
src/
  domain/        # Pure logic (board, rng, cards, deck, engine, fsm)
  ui/            # React components & hooks
  net/           # (future) transport implementations
  ai/            # (future) bot strategies
  styles/        # Tailwind entrypoint
  tests/         # Co-located higher-level tests
```

- Domain layer is framework-agnostic; all side-effects go through explicit events.
- Card effects return structured patches/events; UI never encodes rule logic.

## Adding a New Card (High-Level)

1. Create a new file under `src/domain/cards/` implementing `CardDefinition`.
2. Define: `id`, `target`, `canPlay`, `validateTarget`, `effect`.
3. Register it in `registry.ts` via `registerCard` (ensures UI metadata exposure).
4. Add tests:
   - Positive: playable & effect results
   - Negative: invalid target / cannot play scenario
5. Run `npm run test` and ensure deterministic behavior with a fixed seed.
6. Update docs if it introduces new mechanics.

(A full dev doc with a template will be added — see TODO.)

## Simultaneous Five Policy

Defined in `docs/Rules.md`. After any effect resolves, if both players have >=1 winning lines:

- `attacker`: active player wins (default)
- `draw`: game ends in a draw

## Persistence

- `localStorage.boardTheme` stores the user’s chosen board theme.
- Planned: persist last match params (seed, policy, board size) and future user preferences.

## Deterministic RNG

All randomness (deck shuffles, multi-placement effects) uses the match seed via a unified PRNG module to guarantee reproducibility across replay / online sessions.

## Roadmap (Excerpt)

See `docs/TODO.md` for full list.

- Transport interface + HotSeat → WebSocket
- BotStrategy interface + baseline random / heuristic bot
- CI (GitHub Actions) with lint/type/test/build gates
- Card authoring guide & advanced cards

## Development Notes

- Strict TypeScript (no implicit any, narrow types for players/stones)
- Pure functions & immutability (Immer where mutation semantics help)
- Tailwind for styling; avoid inline style objects except for dynamic SVG attributes
- Keep UI dumb: no rule branching inside React components

### Repo Meta

Internal GitHub automation & AI customization docs live in [`./.github/STRUCTURE.md`](./.github/STRUCTURE.md).

## License

Apache-2.0

## Deployment (GitHub Pages)

This repo is configured to auto-deploy the production bundle to GitHub Pages using a workflow in `.github/workflows/deploy.yml`.

Steps (one-time repository setup):

1. In GitHub repo settings, enable Pages: Settings → Pages → Build & deployment → Source: GitHub Actions.
2. Go to Actions → Deploy to GitHub Pages → Run workflow (manual trigger). First successful run provisions the Pages environment.

Trigger model: manual only (workflow_dispatch). It will NOT auto-run on pushes to `main`.
Pipeline gates: lint, typecheck, test, then build. Only on success will it publish the `dist` folder.

Local preview of the production build:

```bash
npm run build
npm run preview
```

The Vite `base` is set to `/${REPO_NAME}/` so assets resolve correctly at `https://<user>.github.io/jineng-wuziqi/`.

To deploy from a fork or different repo name:

1. Update `REPO_NAME` in `vite.config.ts`.
2. (Optional) Adjust README references.
3. Manually re-run the workflow.

Custom domain: set `base: '/'` in `vite.config.ts` and add a `CNAME` file under `public/` (create if missing) before building.
