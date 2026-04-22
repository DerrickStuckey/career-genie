import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../ranking';

describe('RankingEngine', () => {
  it('returns a sorted result for 3 items', () => {
    const engine = new RankingEngine(['C', 'A', 'B']);

    const comparisons: [string, string][] = [];
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair();
      expect(pair).not.toBeNull();
      if (!pair) break;

      comparisons.push(pair);
      // Always pick alphabetically earlier (A > B > C in "importance")
      const winner = pair[0] < pair[1] ? pair[0] : pair[1];
      engine.recordChoice(winner);
    }

    const result = engine.getResult();
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('returns correct comparison count estimate', () => {
    const engine = new RankingEngine(['A', 'B', 'C', 'D', 'E']);
    expect(engine.getTotalEstimate()).toBeGreaterThanOrEqual(5);
    expect(engine.getTotalEstimate()).toBeLessThanOrEqual(15);
  });

  it('tracks completed comparisons', () => {
    const engine = new RankingEngine(['A', 'B', 'C']);
    expect(engine.getCompletedCount()).toBe(0);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice(pair[0]);
    expect(engine.getCompletedCount()).toBe(1);
  });

  it('handles single item', () => {
    const engine = new RankingEngine(['A']);
    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A']);
  });

  it('handles two items', () => {
    const engine = new RankingEngine(['B', 'A']);
    expect(engine.isComplete()).toBe(false);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice('A');

    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A', 'B']);
  });

  it('sorts 10 items correctly', () => {
    const items = ['J', 'E', 'A', 'H', 'C', 'F', 'B', 'G', 'D', 'I'];
    const engine = new RankingEngine(items);

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      const winner = pair[0] < pair[1] ? pair[0] : pair[1];
      engine.recordChoice(winner);
    }

    expect(engine.getResult()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  });
});
