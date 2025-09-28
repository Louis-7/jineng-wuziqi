# Gomoku (Card Edition) — Official Rules

This project blends classic Gomoku with a draw–play–discard card mechanic. This document is the single source of truth for gameplay and testing.

## Board and Victory

- Board: 15×15 by default (configurable). The board is a grid of horizontal and vertical lines; stones are placed on the intersections (not inside squares).
- Stones: Player 1 = Black (1), Player 2 = White (2).
- Win: A contiguous line of 5 or more stones of the same color in any direction (horizontal, vertical, diagonal) immediately wins the game.
- Simultaneous five-in-a-row: see “Simultaneous Five Policy” below.

## Turn and Deck Flow

- Players alternate turns.
- Per turn:
  1. Draw: Draw 2 cards from the deck. If the draw pile is insufficient, reshuffle the discard pile to complete the draw.
  2. Choose: Select 1 card to play and discard the other.
  3. Target: If the played card requires a target (cell/stone/player), select a legal target; illegal selections must be corrected.
  4. Resolve: Apply the card effect to update the board and statuses.
  5. Check Win: If a five-in-a-row is achieved, end the game immediately.
  6. End: End the turn; switch to the opponent (if the opponent is frozen, skip their next turn).
- Deck and discard:
  - Shared deck and discard piles.
  - When drawing with insufficient cards in the draw pile, reshuffle the discard pile to continue the draw.
- First player: Player 1 by default (configurable).

## Base Cards

Format: Card → Target/Restrictions → Effect → Notes.

### 1) Place Stone

- Target/Restrictions:
  - Must select an empty intersection on the board (i.e., a grid line crossing).
- Effect:
  - Place one stone of the current player at that intersection.
- Notes:
  - Immediately triggers a win check after resolution.
  - Illegal target: selecting an occupied intersection must be rejected (UI should disable; engine must validate and refuse the action).

### 2) Take Stone

- Target/Restrictions:
  - Must select an opponent’s stone (cannot select your own stone).
- Effect:
  - Remove the selected stone from the board.
- Notes:
  - Removing a stone placed in the same round is allowed.
  - Illegal target: selecting your own stone must be rejected with clear feedback.

## Skill Cards (MVP)

### 3) Polarity Inversion

- Target/Restrictions:
  - No target; applies globally.
- Effect:
  - Swap ownership of all stones on the board: Black ↔ White (1 ↔ 2).
- Notes:
  - Perform win check after resolution; if both sides have five, apply the Simultaneous Five Policy.

### 4) Time Freeze

- Target/Restrictions:
  - Target is the opponent player.
- Effect:
  - Opponent skips their next turn. This status stacks (multiple freezes → multiple skips).
- Notes:
  - At the start of the opponent’s turn, if `skipNextTurns > 0`, immediately skip draw and consume one skip; turn passes back.
  - Cannot target self; the engine must reject attempts to target the active player.

### 5) Spontaneous Generation

- Target/Restrictions:
  - No target; requires at least 5 empty cells on the board. If fewer than 5, the card is not playable (UI should disable).
- Effect:
  - Randomly select 5 distinct empty cells; for each cell, independently assign a random color (Black/White) and place a stone.
- Notes:
  - If both sides achieve five during this single resolution, apply the Simultaneous Five Policy.
  - All randomness uses the match seed for reproducible replays and online consistency.

## Simultaneous Five Policy

When a single effect (card or action) resolves and, as a result, both players have one or more lines with length ≥ 5 at the same time, apply this policy:

- Timing: Always resolve the entire effect first, then perform a global win check.
- Default: Attacker Priority — the active player (whose turn it is / who played the card) wins.
- Configurable: `simultaneousFivePolicy` may be set to one of:
  - `attacker` (default): active player wins.
  - `draw`: the game ends immediately in a draw.
- Overlines: “≥ 5” includes 6-in-a-row or longer and still satisfies victory.
- Typical sources: global effects such as Polarity Inversion and multi-placement effects such as Spontaneous Generation may trigger simultaneous fives; apply the policy after their full resolution.

## Additional Rules and Notes

- Seed and reproducibility:
  - A match seed is set at start. Shuffling and random placements must use the seed-driven PRNG.
- Interactions and invalid actions:
  - Invalid targets (placing on occupied cells, taking own stones, playing Spontaneous Generation with insufficient empty cells, etc.) must be rejected with clear feedback.
- Configurable options (future):
  - Board size, first player, deck composition, simultaneous-five policy, etc. (see “Simultaneous Five Policy”).

---

Any rule changes must update this file and state the impact in the commit message. This file is the authoritative reference for implementation and tests.
