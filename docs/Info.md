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

## Consistency & Extensibility
- CardRegistry centralizes card registration; adding a new card only requires a new file + registry entry.
- All randomness uses the match seed for reproducibility and online consistency.
- Command/Event pattern facilitates networking and replay.

## Testing & Quality Gates
- Unit: win detection, draw/reshuffle, card effects/preconditions, FSM transitions
- E2E: full match flow, invalid target feedback, the three skill cards
- CI: Lint/Typecheck/Test/Build must pass; coverage threshold for core logic

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
