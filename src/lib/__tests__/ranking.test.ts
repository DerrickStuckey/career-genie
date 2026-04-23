import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../ranking';

describe('RankingEngine (Swiss + Elimination)', () => {
  it('handles single item', () => {
    const engine = new RankingEngine(['A']);
    expect(engine.isComplete()).toBe(true);
    expect(engine.getResult()).toEqual(['A']);
    expect(engine.getTotalEstimate()).toBe(0);
  });

  it('handles two items', () => {
    const engine = new RankingEngine(['B', 'A']);
    expect(engine.isComplete()).toBe(false);

    while (!engine.isComplete()) {
      const p = engine.getCurrentPair()!;
      engine.recordChoice(p[0]);
    }

    const result = engine.getResult()!;
    expect(result).toHaveLength(2);
    expect(result).toContain('A');
    expect(result).toContain('B');
  });

  it('runs 2 full rounds + bye match + elimination for 15 items', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      engine.recordChoice(pair[0]);
    }

    const total = engine.getCompletedCount();
    expect(total).toBeGreaterThanOrEqual(15);
    expect(total).toBeLessThanOrEqual(22);
  });

  it('each item appears at most once per full-round pairing', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);
    const matchesPerFullRound = Math.floor(items.length / 2);

    for (let round = 0; round < 2; round++) {
      const seen = new Set<string>();
      for (let m = 0; m < matchesPerFullRound; m++) {
        const pair = engine.getCurrentPair()!;
        expect(seen.has(pair[0])).toBe(false);
        expect(seen.has(pair[1])).toBe(false);
        seen.add(pair[0]);
        seen.add(pair[1]);
        engine.recordChoice(pair[0]);
      }
    }

    expect(engine.isComplete()).toBe(false);
  });

  it('bye match pairs the two items that sat out', () => {
    const items = Array.from({ length: 7 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);
    const matchesPerFullRound = Math.floor(items.length / 2);

    const byeItems = new Set<string>();
    const allItems = new Set(items);

    for (let round = 0; round < 2; round++) {
      const played = new Set<string>();
      for (let m = 0; m < matchesPerFullRound; m++) {
        const pair = engine.getCurrentPair()!;
        played.add(pair[0]);
        played.add(pair[1]);
        engine.recordChoice(pair[0]);
      }
      for (const item of allItems) {
        if (!played.has(item)) byeItems.add(item);
      }
    }

    expect(byeItems.size).toBe(2);
    const byePair = engine.getCurrentPair()!;
    expect(byeItems.has(byePair[0])).toBe(true);
    expect(byeItems.has(byePair[1])).toBe(true);
  });

  it('consistent winner ranks near the top', () => {
    const engine = new RankingEngine(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta']);
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      const winner = pair.includes('Alpha') ? 'Alpha' : pair[0];
      engine.recordChoice(winner);
    }

    const result = engine.getResult()!;
    const alphaIdx = result.indexOf('Alpha');
    expect(alphaIdx).toBeLessThanOrEqual(1);
  });

  it('consistent loser ranks near the bottom', () => {
    const engine = new RankingEngine(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta']);
    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      if (pair.includes('Epsilon')) {
        const winner = pair[0] === 'Epsilon' ? pair[1] : pair[0];
        engine.recordChoice(winner);
      } else {
        engine.recordChoice(pair[0]);
      }
    }

    const result = engine.getResult()!;
    const epsilonIdx = result.indexOf('Epsilon');
    expect(epsilonIdx).toBeGreaterThanOrEqual(result.length - 2);
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

  it('works with even-length item list (no bye match needed)', () => {
    const items = Array.from({ length: 6 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      engine.recordChoice(pair[0]);
    }

    const result = engine.getResult()!;
    expect(result).toHaveLength(6);
    expect(new Set(result).size).toBe(6);
    expect(engine.getCompletedCount()).toBeGreaterThanOrEqual(6);
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

  it('totalEstimate refines once elimination starts', () => {
    const items = Array.from({ length: 15 }, (_, i) => `Item${i}`);
    const engine = new RankingEngine(items);
    const initialEstimate = engine.getTotalEstimate();

    while (!engine.isComplete()) {
      const pair = engine.getCurrentPair()!;
      engine.recordChoice(pair[0]);
    }

    expect(engine.getCompletedCount()).toBe(engine.getTotalEstimate());
    expect(initialEstimate).toBeGreaterThan(0);
  });
});
