# Project TODO (by milestones)

> Use `- []` to mark pending items. You can mark them as complete after acceptance.

## 1) Product rules & docs

- [x] Finalize simultaneous-five policy and configurability
- [x] Review and approve Rules.md (including three skill cards)
- [x] Add online/AI design notes in Info.md

## 2) Project scaffolding

- [x] Initialize Vite + React + TypeScript app
- [x] Configure Tailwind, ESLint, Prettier, Vitest, Husky
- [x] Establish folders: src/{domain,machine,ui,net,ai,types,utils,styles,tests}

## 3) RNG & deck

- [x] Implement seedable PRNG and Fisher–Yates shuffle
- [x] Deck: draw/discard/reshuffle, including mid-draw reshuffle
- [x] Unit tests: determinism by seed, reshuffle-on-empty

## 4) Board & win detection

- [x] Board data structure and place/remove APIs
- [x]Four-direction scan from last move (h/v/diag)
- [x] Unit tests: edges, ≥5-in-row, avoid double-counting

## 5) Card system foundation

- [] Define CardDefinition/TargetSchema/error types
- [] CardRegistry + automatic UI mapping (icon/description)
- [] Target selector (empty cell/opponent stone/player), common highlight and validation

## 6) MVP card implementations

- [] Place: only empty cell allowed + error feedback
- [] Take: only opponent stones allowed
- [] Polarity Inversion: global swap + win check
- [] Time Freeze: skipNextTurns stack and consume
- [] Spontaneous Generation: requires ≥5 empties + random 5 + win check
- [] Unit tests: all above cards

## 7) Turn FSM (XState)

- [] Phases: drawTwo → choose → selectTarget → resolve → checkWin → endTurn
- [] Guards: target legality/empty-check; freeze skip logic
- [] Event log and state serialization (for replay/networking)

## 8) UI components

- [] Board/Cell: responsive, last-move highlight, winning line
- [] CardChoice/TurnPanel: play/discard, target guidance
- [] StatusBar: current player, deck/discard counters, freeze notice
- [] Modals: new match (settings/composition/seed), help (rules)
- [] Basic a11y (keyboard/ARIA/contrast)

## 9) Settings & persistence

- [] LocalStorage: persist settings and last match params
- [] Theme preference (light/dark)

## 10) Online-ready plumbing

- [] Transport interface: send(Command)/on(Event/StateSync)/handshake
- [] HotSeatTransport (local direct)
- [] Protocol draft (Command/Event schema, protocolVersion)

## 11) AI-ready plumbing

- [] BotStrategy interface: decideTurn(state, availableCards, rng)
- [] Baseline random strategy and injection points (not enabled by default)

## 12) Tests & CI/CD

- [] Vitest/RTL/Playwright scaffolding scripts
- [] GitHub Actions: Lint/Typecheck/Test/Build
- [] Coverage threshold for core modules

## 13) Docs & DX

- [] README: run, test, rules summary, extension guide
- [] Dev doc: how to add a new card (template + registry)
- [] Keep Info.md/Rules.md changelog updated
