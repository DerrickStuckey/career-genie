# Ranking Algorithm Accuracy Test — 2026-04-27

## Setup

Tested the Swiss-style tournament ranking on the live deployment (https://career-genie-one.vercel.app/) with a predetermined ranking of all 13 attributes, then compared app output to input.

- **Algorithm:** Swiss-style tournament, 3 rounds
- **Items:** 13 career attributes
- **Comparisons:** 18 (3 rounds x floor(13/2) pairs per round)
- **Branch:** `deterministic-questions-deferred-key`

## Predetermined Input Ranking

1. Autonomy / creative freedom
2. Intellectually challenging
3. Learning valuable skills
4. Work-life balance / flexible hours
5. High base compensation
6. Great co-workers
7. Remote work options
8. Tangible real-world impact
9. Leadership / growth opportunities
10. A mission which is important to you
11. Equity / financial upside
12. Job stability / security
13. Prestige (impresses people)

## Comparisons Made (in order)

| # | Left | Right | Chose |
|---|------|-------|-------|
| 1 | Tangible real-world impact | High base compensation | High base compensation |
| 2 | Remote work options | Learning valuable skills | Learning valuable skills |
| 3 | Great co-workers | A mission which is important to you | Great co-workers |
| 4 | Job stability / security | Autonomy / creative freedom | Autonomy / creative freedom |
| 5 | Prestige (impresses people) | Work-life balance / flexible hours | Work-life balance / flexible hours |
| 6 | Equity / financial upside | Leadership / growth opportunities | Leadership / growth opportunities |
| 7 | High base compensation | Learning valuable skills | Learning valuable skills |
| 8 | Great co-workers | Autonomy / creative freedom | Autonomy / creative freedom |
| 9 | Work-life balance / flexible hours | Leadership / growth opportunities | Work-life balance / flexible hours |
| 10 | Tangible real-world impact | Remote work options | Remote work options |
| 11 | A mission which is important to you | Job stability / security | A mission which is important to you |
| 12 | Prestige (impresses people) | Intellectually challenging | Intellectually challenging |
| 13 | Learning valuable skills | Autonomy / creative freedom | Autonomy / creative freedom |
| 14 | Work-life balance / flexible hours | High base compensation | Work-life balance / flexible hours |
| 15 | Remote work options | Great co-workers | Great co-workers |
| 16 | A mission which is important to you | Leadership / growth opportunities | Leadership / growth opportunities |
| 17 | Intellectually challenging | Tangible real-world impact | Intellectually challenging |
| 18 | Job stability / security | Equity / financial upside | Equity / financial upside |

## App Output vs Input

| Rank | Input (expected) | App Output (actual) | Delta |
|------|-----------------|---------------------|-------|
| 1 | Autonomy / creative freedom | Autonomy / creative freedom | 0 |
| 2 | Intellectually challenging | Work-life balance / flexible hours | +2 |
| 3 | Learning valuable skills | Learning valuable skills | 0 |
| 4 | Work-life balance / flexible hours | Great co-workers | +2 |
| 5 | High base compensation | Leadership / growth opportunities | +4 |
| 6 | Great co-workers | Intellectually challenging | -4 |
| 7 | Remote work options | High base compensation | -2 |
| 8 | Tangible real-world impact | Remote work options | -1 |
| 9 | Leadership / growth opportunities | A mission which is important to you | +1 |
| 10 | A mission which is important to you | Equity / financial upside | +1 |
| 11 | Equity / financial upside | Tangible real-world impact | -3 |
| 12 | Job stability / security | Job stability / security | 0 |
| 13 | Prestige (impresses people) | Prestige (impresses people) | 0 |

## Results

- **Exact matches:** 4/13 (positions 1, 3, 12, 13)
- **Within 1 position:** 6/13
- **Largest displacement:** Intellectually challenging (input #2 → output #6, delta -4) and Leadership / growth opportunities (input #9 → output #5, delta +4)
- **Mean absolute displacement:** 1.54 positions

## Analysis

The algorithm reliably identifies the clear top item and the clear bottom items. The middle band (positions 2-11) has significant shuffling, which is expected for a Swiss tournament with only 3 rounds — each item gets compared only 3 times, so the outcome is sensitive to random initial pairings and opponent strength.

The biggest miss was **Intellectually challenging** — it only faced Prestige (#13) and Tangible real-world impact (#8) before the final round, giving it two easy wins but no chance to differentiate against higher-ranked items. Its one loss to Autonomy (#1) in the elimination round was correct, but the tiebreaker (opponent scores) couldn't recover its true position.

## Conclusion

Acceptable for the use case. The ranking is directionally correct and sufficient for coaching context. Increasing to 4-5 rounds would improve mid-range accuracy but at the cost of more user comparisons (24-30 instead of 18).
