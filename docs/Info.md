# Project Overview (Jineng Wuziqi)

A web-based “Gomoku + card-draw” game with a clear modular architecture to support future online PvP and Player vs CPU, and deterministic rules (seeded RNG) for reproducibility.

## Tech Stack
- Frontend: React + TypeScript + Vite
- State/Flow: XState (FSM) + Immer (immutable updates)
- Styling: Tailwind CSS (CSS Grid for board)
- Testing: Vitest + React Testing Library + Playwright
- Randomness: Seedable PRNG (mulberry32/xorshift) + Fisher–Yates shuffle
- Persistence: LocalStorage (settings, last match seed)
- Extensibility:
  - Online PvP: Transport interface (Hot-seat now → WebSocket later)
  - AI: BotStrategy interface (decideTurn)

## Architecture
- domain (pure TS, no UI/network)
  - board: board ops and win detection
  - rng: seeded random/shuffle
  - cards: card definitions, validation, effects
  - deck: draw/discard/reshuffle
  - status: persistent effects (freeze, etc.)
  - engine: match context + command/event + rules
  - fsm: turn phases (draw → choose → target → resolve → checkWin → endTurn)
- app (React UI)
  - Components: Board/Cell, CardChoice, TurnPanel, StatusBar, Modals
  - Adapter: map UI events → engine commands; subscribe to events to render
- net (future)
  - Transport: send(Command)/on(Event/StateSync)
  - HotSeat (MVP) → WebSocket implementation (later)
- ai (future)
  - BotStrategy: decideTurn(state, cards, rng)

## Data Model (summary)
- Board: number[][] (0 empty, 1 black, 2 white)
- Cell: { x: number; y: number }
- Player: 1 | 2
- Status: { skipNextTurns: Record<Player, number> }
- CardDefinition: { id; type; name; desc; target; canPlay; validateTarget; effect }
- DeckState: { drawPile: CardId[]; discardPile: CardId[] }
- GameSettings: { boardSize; firstPlayer; deckComposition; seed }
- GameContext: { board; currentPlayer; deck; statuses; drawnCards; winner?; lastMove?; settings }
- Settings include `simultaneousFivePolicy`: 'attacker' | 'draw' (default 'attacker')

## Consistency & Extensibility
- CardRegistry centralizes card registration; adding a new card only requires a new file + registry entry.
- All randomness uses the match seed for reproducibility and online consistency.
- Command/Event pattern facilitates networking and replay.

## Online Design Notes (draft)

- Transport contract:
  - handshake: { protocolVersion; matchId; seed; settings }
  - send(Command): client → host; on(Event|StateSync): host → client
  - protocolVersion: semantic version; minor compatible, major may require upgrade
- Sync model:
  - Event-sourced log with deterministic engine → authoritative StateSync snapshots for late join/recovery
  - All randomness derives from seed; no client-side hidden RNG
- Commands (examples):
  - startMatch(settings), drawTwo(), playCard(cardId, target?), discard(cardId), endTurn()
- Events (examples):
  - matchStarted, cardsDrawn, cardPlayed, effectResolved, winChecked, turnEnded, stateSync
- Reconciliation:
  - Client submits intents; server/host validates via engine and echoes canonical events
  - Mismatch → reject with reason; client rolls back to last StateSync

## AI Design Notes (draft)

- BotStrategy interface:
  - decideTurn(state, availableCards, rng): Command[] | { cardId; target? } plan
  - Pure, time-bounded, no side effects; random choices use injected rng from seed
- Baseline strategy:
  - Random legal target selection with simple heuristics (prefer immediate win/block)
- Injection points:
  - Engine queries BotStrategy when current player is bot; UI remains passive observer
- Determinism:
  - Given same seed/state, bot decisions are reproducible for replay/testing

## Testing & Quality Gates

- Unit: win detection, draw/reshuffle, card effects/preconditions, FSM transitions
- E2E: full match flow, invalid target feedback, the three skill cards
- CI: Lint/Typecheck/Test/Build must pass; coverage threshold for core logic
  - Tests must cover simultaneous-five outcomes for both policies ('attacker'/'draw') after effect resolution (e.g., Polarity Inversion, Spontaneous Generation)

## MVP Acceptance

- Hot-seat PvP; turn flow draw 2 / play 1 / discard 1; place/take/three skills work; immediate win checks; freeze skips turns; Spontaneous Generation requires ≥5 empty cells.
- Usable UI with basic accessibility; configurable and persisted basic settings.

## Suggested Layout

- src/
  - domain/ (board, rng, deck, cards, engine, fsm)
  - ui/ (components, pages)
  - net/ (transport)
  - ai/ (strategies)
  - types/, utils/, styles/, tests/
- docs/ (Rules.md, Info.md, TODO.md)
- .github/ (copilot-instructions.md, instructions/, chatmodes/)
