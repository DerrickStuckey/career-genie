# Ranking Algorithm Update — 2026-04-23

## Summary

Replaced the original merge-sort ranking algorithm (~50-70 comparisons for 17 items) with a Swiss-style tournament + elimination hybrid (~17-19 comparisons for 15 items). The goal was to reduce user fatigue while still producing a good ranking, especially at the top of the list.

## Changes Made

### Iteration 1: Swiss Tournament (3 full rounds)

**Branch:** `swiss-tournament-ranking` (merged to main via PR #3)

- Replaced generator-based merge sort with a 3-round Swiss tournament
- Each round: sort items by score, pair adjacent items, odd item gets bye
- Tiebreaking by strength of schedule (sum of opponents' scores)
- 21 comparisons for 15 items (3 rounds × 7 matches)
- Shuffles items on construction for fair initial pairings

### Iteration 2: Reduced to 2 full rounds + mini round

**Intermediate step, not shipped separately**

- 2 full rounds (14 comparisons) + 1 targeted match at the top = 15 total
- Mini round pairs the two highest-scoring items to resolve #1 vs #2
- Identified issue: with 15 items (odd), 2 items get byes and only play once

### Iteration 3: Swiss + Bye Match + Elimination Tournament

**Branch:** `swiss-elimination-ranking` (pushed, rebased onto main)

- 2 full Swiss rounds (7 matches each = 14 comparisons)
- 1 bye match: the 2 items that sat out face each other (1 comparison)
- Single-elimination tournament among all items with 2 wins (~2-4 comparisons)
- Total: ~17-19 comparisons depending on how many items go undefeated
- Progress bar estimate starts at 18, refines to exact count when elimination begins

## Files Modified

- `src/lib/ranking.ts` — Complete rewrite: phase-based engine (full → bye-match → elimination)
- `src/lib/__tests__/ranking.test.ts` — 11 test cases covering edge cases, bye match correctness, elimination behavior, progress tracking
- `src/context/SessionContext.tsx` — Updated item list (15 items with reworded labels) and total estimate formula

## Algorithm Design

```
Phase 1: Full Round 1
  - Sort by score, pair adjacent items
  - Lowest-scoring item without a bye sits out
  - 7 matches

Phase 2: Full Round 2
  - Re-sort by score, pair adjacent items
  - Different item sits out (bye)
  - 7 matches

Phase 3: Bye Match
  - The 2 items that had byes face each other
  - 1 match

Phase 4: Elimination
  - Collect all items with 2+ wins
  - Seed by strength of schedule
  - Single elimination bracket (odd count: top seed gets bye)
  - ~2-4 matches
```

**Final ranking order:**
1. Elimination participants in reverse finish order (winner first)
2. Remaining items sorted by score desc, then strength of schedule desc

## Design Decisions

- **Why not pure Swiss (3 rounds)?** 21 comparisons was good but we wanted fewer. Pure 2-round Swiss (14) didn't differentiate the middle well enough.
- **Why elimination for top items?** The top of the ranking matters most for career advice. Elimination ensures the best items are directly compared against each other.
- **Why dynamic total estimate?** The number of 2-win items varies by run, so the elimination round count isn't known until after the Swiss rounds complete. The estimate refines at that point.
- **Strength of schedule tiebreaking:** Items that beat strong opponents rank higher than items that beat weak ones, even at the same win count.

## Known Issues

- **Wizard step guards block direct navigation:** Going directly to `/rank` (skipping chat) causes the results page to redirect back to setup because `wizardStep` is still `'setup'`. This affects testing — need to either relax guards or add a dev bypass.

## Testing

- 20 tests passing across 3 test files (11 ranking, 7 context, 2 llm-client)
- Production build clean
- Manual testing identified the wizard step redirect issue (not yet fixed)
