import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../ranking';

describe('RankingEngine (Swiss Tournament)', () => {
  it('handles single item', () => {
    const engine = new RankingEngine(['A']);
    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A']);
    expect(engine.getTotalEstimate()).toBe(0);
  });

  it('handles two items', () => {
    const engine = new RankingEngine(['B', 'A']);
    expect(engine.isComplete()).toBe(false);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice(pair[0]);

    // After 1 comparison out of 3 rounds × 1 match = 3, but with 2 items
    // totalEstimate = 3 * floor(2/2) = 3
    // But engine should complete after all rounds
    // Actually with 2 items: 3 rounds × 1 match = 3 comparisons
    while (!engine.isComplete()) {
      const p = engine.getCurrentPair()!;
      engine.recordChoice(p[0]);
    }

    expect(engine.isComplete()).toBe(true);
    const result = engine.getResult()!;
    expect(result).toHaveLength(2);
    expect(result).toContain('A');
    expect(result).toContain('B');
  });

  it('produces correct total estimate', () => {
    const items15 = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items15);
    expect(engine.getTotalEstimate()).toBe(21); // 3 * floor(15/2)

    const items10 = Array.from({ length: 10 }, (_, i) => `Item${i}`);
    const engine10 = new RankingEngine(items10);
    expect(engine10.getTotalEstimate()).toBe(15); // 3 * floor(10/2)
  });

  it('completes in exactly totalEstimate comparisons', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);
    const expected = engine.getTotalEstimate();

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      engine.recordChoice(pair[0]);
    }

    expect(engine.getCompletedCount()).toBe(expected);
  });

  it('consistent winner ranks first', () => {
    const engine = new RankingEngine(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      // Always pick 'Alpha' if present, otherwise pick first
      const winner = pair.includes('Alpha') ? 'Alpha' : pair[0];
      engine.recordChoice(winner);
    }

    expect(engine.getResult()![0]).toBe('Alpha');
  });

  it('consistent loser ranks last', () => {
    const engine = new RankingEngine(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      // Always pick against 'Epsilon' if present, otherwise pick first
      if (pair.includes('Epsilon')) {
        const winner = pair[0] === 'Epsilon' ? pair[1] : pair[0];
        engine.recordChoice(winner);
      } else {
        engine.recordChoice(pair[0]);
      }
    }

    const result = engine.getResult()!;
    expect(result[result.length - 1]).toBe('Epsilon');
  });

  it('each item appears at most once per round pairing', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);
    const matchesPerRound = Math.floor(items.length / 2);

    for (let round = 0; round < 3; round++) {
      const seen = new Set<string>();
      for (let m = 0; m < matchesPerRound; m++) {
        const pair = engine.getCurrentPair()!;
        expect(seen.has(pair[0])).toBe(false);
        expect(seen.has(pair[1])).toBe(false);
        seen.add(pair[0]);
        seen.add(pair[1]);
        engine.recordChoice(pair[0]);
      }
    }

    expect(engine.isComplete()).toBe(true);
  });

  it('result contains all items exactly once', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      engine.recordChoice(pair[0]);
    }

    const result = engine.getResult()!;
    expect(result).toHaveLength(15);
    expect(new Set(result).size).toBe(15);
    for (const item of items) {
      expect(result).toContain(item);
    }
  });

  it('tracks completed comparisons incrementally', () => {
    const engine = new RankingEngine(['A', 'B', 'C', 'D', 'E']);
    expect(engine.getCompletedCount()).toBe(0);

    const pair = engine.getCurrentPair()!;
    engine.recordChoice(pair[0]);
    expect(engine.getCompletedCount()).toBe(1);

    const pair2 = engine.getCurrentPair()!;
    engine.recordChoice(pair2[0]);
    expect(engine.getCompletedCount()).toBe(2);
  });
});
